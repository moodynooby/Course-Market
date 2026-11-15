#!/usr/bin/env python3
"""Convert a course directory (CSV or XLSX) into a semester JSON file and optionally seed it.

The directory file is the source of truth published by the university; one row is one
course, and the `Schedule` cell lists every section and its weekly meetings.

Usage:
    # Generate .import/semesters/Winter2027.json
    python3 scripts/csv_to_semester_json.py \
        --input Course_Directory_Winter_2027.xlsx \
        --semester-id Winter2027 \
        --semester-name "Winter Semester 2027"

    # Generate and seed in one step
    python3 scripts/csv_to_semester_json.py \
        --input Course_Directory_Winter_2027.xlsx \
        --semester-id Winter2027 \
        --semester-name "Winter Semester 2027" --seed

XLSX support uses only the standard library: the workbook's first worksheet is read,
including shared strings, inline strings, and cached cell values.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree

PROJECT_ROOT = Path(__file__).resolve().parent.parent

XLSX_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

DAY_MAP = {
    "Sun": "Su", "Mon": "M", "Tue": "T", "Wed": "W",
    "Thu": "Th", "Fri": "F", "Sat": "Sa",
}
DAY_PREFIXES = {
    "su": "Su", "sun": "Su", "sunday": "Su",
    "m": "M", "mo": "M", "mon": "M", "monday": "M",
    "t": "T", "tu": "T", "tue": "T", "tues": "T", "tuesday": "T",
    "w": "W", "we": "W", "wed": "W", "wednesday": "W",
    "th": "Th", "thu": "Th", "thur": "Th", "thurs": "Th", "thursday": "Th",
    "f": "F", "fr": "F", "fri": "F", "friday": "F",
    "sa": "Sa", "sat": "Sa", "saturday": "Sa",
}
VALID_DAYS = {"M", "T", "W", "Th", "F", "Sa", "Su"}

# "Section 1 | 08:00-09:30 (Wed) (04-01-2027 to 18-04-2027)"
SECTION_LINE_PATTERN = re.compile(r"^\s*Section\s+(?P<num>\d+)\s*\|\s*", re.IGNORECASE)
SLOT_PATTERN = re.compile(
    r"(?P<start>\d{1,2}:\d{2})\s*-\s*(?P<end>\d{1,2}:\d{2})\s*"
    r"\((?P<day>[A-Za-z]+)\)"
    r"(?:\s*\((?P<start_date>\d{2}-\d{2}-\d{4})\s+to\s+(?P<end_date>\d{2}-\d{2}-\d{4})\))?"
)
# Legacy directory format: "Mon [08:00 to 09:30] [04-01-2027 to 18-04-2027]"
LEGACY_SLOT_PATTERN = re.compile(
    r"(?P<day>[A-Za-z]+)\s+"
    r"\[(?P<start>\d{1,2}:\d{2})\s+to\s+(?P<end>\d{1,2}:\d{2})\]\s+"
    r"(?:\[(?P<start_date>\d{2}-\d{2}-\d{4})\s+to\s+(?P<end_date>\d{2}-\d{2}-\d{4})\])?",
    re.IGNORECASE,
)

COURSE_CODE_PATTERN = re.compile(r"^([A-Z]+\s*\d+)")
PLACEHOLDER_NAMES = {"Not added", "To Be Announced", "TBA"}


def split_instructor_names(raw: str) -> list[str]:
    """Split concatenated instructor names into individual names.

    Handles comma-separated ("Alice, Bob"), concatenated ("AliceBob"), and mixed
    formats, then drops placeholders such as "To Be Announced" or "TBA".
    """
    raw = re.sub(r"\s{2,}", " ", raw).strip()
    if not raw:
        return []

    parts = [part.strip() for part in raw.split(",") if part.strip()]

    split_parts: list[str] = []
    for part in parts:
        split_names = re.sub(
            r"([a-z])([A-Z])", lambda match: f"{match.group(1)}\x00{match.group(2)}", part
        ).split("\x00")
        split_parts.extend(name.strip() for name in split_names if name.strip())

    names = []
    for name in split_parts:
        cleaned = re.sub(r"\.\.\.$", "", name).strip()
        if cleaned and cleaned not in PLACEHOLDER_NAMES:
            names.append(cleaned)
    return names


def clean_course_code(raw: str) -> str:
    match = COURSE_CODE_PATTERN.match(raw.strip())
    return (match.group(1) if match else raw.strip()).replace(" ", "")


def extract_subject(course_code: str) -> str:
    match = re.match(r"^([A-Z]+)", course_code)
    return match.group(1) if match else course_code


def parse_date_to_iso(date_str: str | None) -> str | None:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip(), "%d-%m-%Y").strftime("%Y-%m-%d")
    except ValueError as error:
        raise ValueError(f"Invalid schedule date {date_str!r}") from error


def normalize_day(raw: str) -> str:
    day = DAY_MAP.get(raw.capitalize()) or DAY_PREFIXES.get(raw.lower())
    if day is None:
        raise ValueError(f"Unrecognized weekday {raw!r} in schedule")
    return day


def parse_slot(text: str) -> dict | None:
    """Parse a single meeting line; return None for lines without a time (for example TBA)."""
    match = SLOT_PATTERN.search(text) or LEGACY_SLOT_PATTERN.search(text)
    if match is None:
        return None

    slot = {
        "day": normalize_day(match.group("day")),
        "startTime": match.group("start").zfill(5),
        "endTime": match.group("end").zfill(5),
    }
    start_date = parse_date_to_iso(match.group("start_date"))
    end_date = parse_date_to_iso(match.group("end_date"))
    if start_date:
        slot["startDate"] = start_date
    if end_date:
        slot["endDate"] = end_date
    return slot


def parse_sections(schedule: str | None) -> list[tuple[str, list[dict]]]:
    """Group a row's schedule cell into (section number, time slots) pairs."""
    grouped: dict[str, list[dict]] = {}
    order: list[str] = []

    for raw_line in (schedule or "").replace("\r", "").split("\n"):
        line = raw_line.strip()
        if not line:
            continue

        header = SECTION_LINE_PATTERN.match(line)
        number = header.group("num").zfill(3) if header else "001"
        body = line[header.end():] if header else line

        slot = parse_slot(body)
        if number not in grouped:
            grouped[number] = []
            order.append(number)
        if slot:
            grouped[number].append(slot)

    if not order:
        grouped["001"] = []
        order.append("001")

    sections = []
    for number in order:
        unique_slots = []
        seen = set()
        for slot in grouped[number]:
            key = (slot["day"], slot["startTime"], slot["endTime"],
                   slot.get("startDate"), slot.get("endDate"))
            if key in seen:
                continue
            seen.add(key)
            unique_slots.append(slot)
        sections.append((number, unique_slots))
    return sections


def read_csv_rows(path: Path) -> list[dict]:
    with open(path, encoding="utf-8-sig", newline="") as handle:
        return [row for row in csv.DictReader(handle)]


def xlsx_column_index(reference: str | None) -> int:
    match = re.match(r"[A-Z]+", reference or "")
    if match is None:
        raise ValueError(f"Invalid XLSX cell reference {reference!r}")
    index = 0
    for letter in match.group(0):
        index = index * 26 + (ord(letter) - ord("A") + 1)
    return index - 1


def read_xlsx_cells(path: Path) -> list[dict[int, str]]:
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())

        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in names:
            root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(node.itertext()) for node in root.findall(f"{{{XLSX_NS}}}si")
            ]

        workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
        sheet = workbook.find(f"{{{XLSX_NS}}}sheets/{{{XLSX_NS}}}sheet")
        if sheet is None:
            raise ValueError(f"{path.name} has no worksheets")
        relationship_id = sheet.get(f"{{{REL_NS}}}id")

        relationships = ElementTree.fromstring(
            archive.read("xl/_rels/workbook.xml.rels")
        )
        sheet_path = None
        for relationship in relationships.findall(f"{{{PKG_REL_NS}}}Relationship"):
            if relationship.get("Id") == relationship_id:
                target = (relationship.get("Target") or "").lstrip("/")
                sheet_path = target if target.startswith("xl/") else f"xl/{target}"
                break
        if sheet_path is None or sheet_path not in names:
            raise ValueError(f"Could not locate the first worksheet in {path.name}")

        worksheet = ElementTree.fromstring(archive.read(sheet_path))
        rows: list[dict[int, str]] = []
        for row in worksheet.findall(f".//{{{XLSX_NS}}}row"):
            cells: dict[int, str] = {}
            for cell in row.findall(f"{{{XLSX_NS}}}c"):
                column = xlsx_column_index(cell.get("r"))
                kind = cell.get("t")

                if kind == "inlineStr":
                    value = "".join(
                        text
                        for node in cell.findall(f"{{{XLSX_NS}}}is")
                        for text in node.itertext()
                    )
                else:
                    node = cell.find(f"{{{XLSX_NS}}}v")
                    value = node.text if node is not None and node.text else ""
                    if kind == "s" and value:
                        value = shared_strings[int(value)]
                cells[column] = value
            if cells:
                rows.append(cells)
        return rows


def read_xlsx_rows(path: Path) -> list[dict]:
    cells = read_xlsx_cells(path)
    if not cells:
        return []

    width = max(max(row) for row in cells) + 1
    header = [cells[0].get(column, "").strip() for column in range(width)]

    rows = []
    for raw in cells[1:]:
        rows.append({header[column]: raw.get(column, "") for column in range(width)})
    return rows


def read_directory_rows(path: Path) -> list[dict]:
    suffix = path.suffix.lower()
    if suffix == ".xlsx":
        return read_xlsx_rows(path)
    if suffix == ".csv":
        return read_csv_rows(path)
    raise ValueError(f"Unsupported directory file type {path.suffix!r}; use .csv or .xlsx")


def build_sections(rows: list[dict], semester_id: str) -> list[dict]:
    semester_suffix = re.sub(r"[^a-z0-9]+", "", semester_id.lower())
    sections: list[dict] = []
    seen_ids: set[str] = set()

    for row in rows:
        course_code = clean_course_code(row.get("Course Code") or "")
        if not course_code:
            continue

        course_name = (row.get("Course Name") or "").strip()
        if not course_name:
            raise ValueError(f"Course {course_code} is missing a name")

        try:
            credits = float(row.get("Credits") or 0)
        except ValueError as error:
            raise ValueError(
                f"Course {course_code} has invalid credits {row.get('Credits')!r}"
            ) from error

        description = (row.get("Course Description") or "").strip() or None
        instructor = ", ".join(split_instructor_names(row.get("Faculty") or ""))

        for section_number, time_slots in parse_sections(row.get("Schedule")):
            section_id = f"{course_code}-{section_number}-{semester_suffix}"
            if section_id in seen_ids:
                raise ValueError(
                    f"Duplicate section id {section_id}; check the directory's Schedule column"
                )
            seen_ids.add(section_id)

            sections.append({
                "id": section_id,
                "courseCode": course_code,
                "courseName": course_name,
                "sectionNumber": section_number,
                "instructor": instructor,
                "credits": credits,
                "subject": extract_subject(course_code),
                "capacity": 0,
                "enrolled": 0,
                "timeSlots": time_slots,
                "description": description,
            })

    return sections


def validate_semester(data: dict) -> list[str]:
    problems: list[str] = []
    sections = data["sections"]

    if not sections:
        problems.append("no sections were produced")

    ids = [section["id"] for section in sections]
    duplicates = sorted({section_id for section_id in ids if ids.count(section_id) > 1})
    if duplicates:
        problems.append(f"duplicate section ids: {', '.join(duplicates[:5])}")

    for section in sections:
        if not section["courseCode"]:
            problems.append(f"section {section['id']} has no course code")
        if section["credits"] < 0:
            problems.append(f"section {section['id']} has negative credits")
        for slot in section["timeSlots"]:
            if slot["day"] not in VALID_DAYS:
                problems.append(f"section {section['id']} has invalid day {slot['day']!r}")
            if slot["startTime"] >= slot["endTime"]:
                problems.append(
                    f"section {section['id']} ends before it starts "
                    f"({slot['startTime']}-{slot['endTime']})"
                )

    return problems


def resolve_inputs(input_paths: list[str] | None) -> list[Path]:
    if not input_paths:
        return sorted(
            path for path in (PROJECT_ROOT / "scripts").glob("*")
            if path.suffix.lower() in {".csv", ".xlsx"}
        )

    resolved = []
    for raw_path in input_paths:
        path = Path(raw_path)
        if path.exists() and path.suffix.lower() in {".csv", ".xlsx"}:
            resolved.append(path)
        else:
            print(f"Warning: skipping '{raw_path}' (not a .csv/.xlsx file)")
    return sorted(set(resolved))


def process_to_semester_json(
    file_paths: list[Path],
    output_path: Path | None,
    semester_id: str,
    semester_name: str,
) -> dict:
    rows: list[dict] = []
    for path in file_paths:
        rows.extend(read_directory_rows(path))

    data = {
        "semesterId": semester_id,
        "semesterName": semester_name,
        "sections": build_sections(rows, semester_id),
    }

    problems = validate_semester(data)
    if problems:
        raise ValueError("Semester data is invalid:\n  - " + "\n  - ".join(problems))

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, separators=(",", ":"))
    else:
        json.dump(data, ensure_ascii=False, separators=(",", ":"))

    return data


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert a CSV/XLSX course directory into a semester JSON file"
    )
    parser.add_argument(
        "--input",
        nargs="*",
        default=None,
        help="Directory files (.csv/.xlsx); defaults to all in scripts/",
    )
    parser.add_argument("--semester-id", required=True, help="e.g. Winter2027")
    parser.add_argument(
        "--semester-name", required=True, help='e.g. "Winter Semester 2027"'
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output JSON path (default: .import/semesters/{semester-id}.json)",
    )
    parser.add_argument(
        "--seed", action="store_true", help="Seed the generated JSON into the database"
    )
    args = parser.parse_args()

    directory_files = resolve_inputs(args.input)
    if not directory_files:
        print("Error: no .csv or .xlsx course directory files found.")
        sys.exit(1)

    print(f"Reading {len(directory_files)} directory file(s):")
    for path in directory_files:
        print(f"  - {path.name}")

    output_path = Path(args.output) if args.output else (
        PROJECT_ROOT / ".import" / "semesters" / f"{args.semester_id}.json"
    )

    try:
        data = process_to_semester_json(
            directory_files, output_path, args.semester_id, args.semester_name
        )
    except ValueError as error:
        print(f"Error: {error}")
        sys.exit(1)

    sections = data["sections"]
    course_count = len({section["courseCode"] for section in sections})
    undated = sum(1 for section in sections if not section["timeSlots"])

    print(f"\nSemester: {args.semester_id} ({args.semester_name})")
    print(f"  Courses:  {course_count}")
    print(f"  Sections: {len(sections)}")
    print(f"  Without scheduled times (TBA): {undated}")
    print(f"  Output:   {output_path}")

    if args.seed:
        print("\nSeeding database...")
        subprocess.run(
            ["pnpm", "run", "db:seed", "--", str(output_path)],
            cwd=PROJECT_ROOT,
            check=True,
        )


if __name__ == "__main__":
    main()
