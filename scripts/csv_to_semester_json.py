#!/usr/bin/env python3
"""CLI tool to merge multiple CSV course files into a minified semester JSON file.

Usage:
    python scripts/csv_to_semester_json.py \
        --semester-id Monsoon2026 \
        --semester-name "Monsoon Semester 2026"

    python scripts/csv_to_semester_json.py \
        --input "scripts/Course Directory (4).csv" \
        --semester-id Monsoon2026 \
        --semester-name "Monsoon Semester 2026"
"""

import argparse
import csv
import json
import re
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DAY_MAP = {
    "Sun": "Su", "Mon": "M", "Tue": "T", "Wed": "W",
    "Thu": "Th", "Fri": "F", "Sat": "Sa",
}

SCHEDULE_PATTERN = re.compile(
    r'(?P<day>[A-Za-z]+)\s+'
    r'\[(?P<start>\d{2}:\d{2})\s+to\s+(?P<end>\d{2}:\d{2})\]\s+'
    r'(?:\[(?P<start_date>\d{2}-\d{2}-\d{4})\s+to\s+(?P<end_date>\d{2}-\d{2}-\d{4})\])?',
    re.IGNORECASE,
)

SECTION_PATTERN = re.compile(r'Section\s+(?P<num>\d+)', re.IGNORECASE)
COURSE_CODE_PATTERN = re.compile(r'^([A-Z]+\s*\d+)')

PLACEHOLDER_NAMES = {'Not added', 'To Be Announced', 'TBA'}


def split_instructor_names(raw: str) -> list[str]:
    """Split concatenated instructor names into individual names.

    Handles three formats:
    - Comma-separated: "Alice, Bob, Charlie"
    - Concatenated: "AliceBobCharlie" (no separator)
    - Mixed: "Alice, BobCharlie"

    Filters out placeholders like "To Be Announced", "Not added", "TBA".
    """
    # Normalize double spaces (artifact from comma removal)
    raw = re.sub(r'\s{2,}', ' ', raw).strip()
    if not raw:
        return []

    # Split by comma first
    parts = [p.strip() for p in raw.split(',') if p.strip()]

    # Split at lowercase→uppercase boundaries (catches concatenated names)
    split_parts: list[str] = []
    for part in parts:
        sub = re.sub(r'([a-z])([A-Z])', r'\1\x00\2', part).split('\x00')
        split_parts.extend(s.strip() for s in sub if s.strip())

    # Strip trailing ellipsis, filter placeholders
    result = []
    for name in split_parts:
        cleaned = re.sub(r'\.\.\.$', '', name).strip()
        if cleaned and cleaned not in PLACEHOLDER_NAMES:
            result.append(cleaned)

    return result


def clean_course_code(raw: str) -> str:
    match = COURSE_CODE_PATTERN.match(raw.strip())
    code = match.group(1) if match else raw.strip()
    return code.replace(" ", "")


def extract_subject(course_code: str) -> str:
    match = re.match(r'^([A-Z]+)', course_code)
    return match.group(1) if match else course_code


def parse_date_to_iso(date_str: str) -> str | None:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip(), "%d-%m-%Y").strftime("%Y-%m-%d")
    except ValueError:
        return None


def parse_schedule(schedule_str: str) -> list[dict]:
    time_slots = []
    for match in SCHEDULE_PATTERN.finditer(schedule_str):
        day_raw = match.group("day")
        day_abbr = DAY_MAP.get(day_raw.capitalize(), day_raw[:2].capitalize())
        start_date = parse_date_to_iso(match.group("start_date"))
        end_date = parse_date_to_iso(match.group("end_date"))

        slot = {
            "day": day_abbr,
            "startTime": match.group("start"),
            "endTime": match.group("end"),
        }
        if start_date:
            slot["startDate"] = start_date
        if end_date:
            slot["endDate"] = end_date
        time_slots.append(slot)
    return time_slots


def split_schedule_blocks(schedule_str: str) -> list[tuple[str, str]]:
    parts = SECTION_PATTERN.split(schedule_str)
    blocks = []
    for i in range(1, len(parts), 2):
        num = parts[i].zfill(3)
        text = parts[i + 1].strip() if i + 1 < len(parts) else ""
        blocks.append((num, text))
    if not blocks:
        blocks.append(("001", schedule_str))
    return blocks


def merge_csvs(file_paths: list[str]) -> list[dict]:
    merged = []
    for fp in file_paths:
        path = Path(fp)
        if not path.exists():
            continue
        with open(path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                merged.append(row)
    return merged


def build_sections(rows: list[dict], semester_id: str) -> list[dict]:
    sections = []
    semester_prefix = semester_id.split('20')[0].lower()
    for row in rows:
        raw_code = row.get("Course Code", "")
        course_code = clean_course_code(raw_code)
        subject = extract_subject(course_code)
        try:
            credits = float(row.get("Credits", "0"))
        except ValueError:
            credits = 0.0

        schedule_str = row.get("Schedule", "")
        for section_number, block in split_schedule_blocks(schedule_str):
            section_id = f"{course_code}-{section_number}-{semester_prefix}"
            time_slots = parse_schedule(block)
            sections.append({
                "id": section_id,
                "courseCode": course_code,
                "courseName": row.get("Course Name", "").strip(),
                "sectionNumber": section_number,
                "instructor": ", ".join(split_instructor_names(row.get("Faculty", ""))),
                "credits": credits,
                "subject": subject,
                "capacity": 0,
                "enrolled": 0,
                "timeSlots": time_slots,
            })
    return sections


def resolve_inputs(input_paths: list[str] | None) -> list[str]:
    if not input_paths:
        return sorted(str(f) for f in (PROJECT_ROOT / "scripts").glob("*.csv"))

    resolved = []
    for p in input_paths:
        path = Path(p)
        if path.exists() and path.suffix == ".csv":
            resolved.append(str(path))
        else:
            print(f"Warning: file not found '{p}'")
    return sorted(set(resolved))


def process_csv_to_json(
    file_paths: list[str],
    output_path: str,
    version: str = "1.0.0",
    semester_id: str = "Monsoon2026",
    semester_name: str = "Monsoon Semester 2026",
) -> dict:
    rows = merge_csvs(file_paths)
    sections = build_sections(rows, semester_id)

    data = {
        "semesterId": semester_id,
        "semesterName": semester_name,
        "sections": sections,
    }

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    return data


def main():
    parser = argparse.ArgumentParser(
        description="Merge CSV course files into a minified semester JSON file"
    )
    parser.add_argument(
        "--input",
        nargs="*",
        default=None,
        help="CSV file paths (default: all *.csv in scripts/)",
    )
    parser.add_argument(
        "--semester-id",
        required=True,
        help="Semester identifier (e.g., Monsoon2026)",
    )
    parser.add_argument(
        "--semester-name",
        required=True,
        help="Human-readable semester name",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output JSON path (default: public/semesters/{semester-id}.json)",
    )
    parser.add_argument(
        "--version",
        default="1.0.0",
        help="Deprecated: no longer used",
    )
    parser.add_argument(
        "--force-refresh",
        action="store_true",
        help="Bump dataVersion to invalidate all client caches",
    )

    args = parser.parse_args()

    csv_files = resolve_inputs(args.input)
    if not csv_files:
        print("Error: No CSV files found.")
        sys.exit(1)

    print(f"Found {len(csv_files)} CSV file(s):")
    for f in csv_files:
        print(f"  - {Path(f).name}")

    output_path = args.output or str(
        PROJECT_ROOT / "public" / "semesters" / f"{args.semester_id}.json"
    )

    print(f"\nOutput: {output_path}")
    print(f"Semester: {args.semester_id} ({args.semester_name})")
    print(f"Version: {args.version}\n")

    result = process_csv_to_json(
        file_paths=csv_files,
        output_path=output_path,
        version=args.version,
        semester_id=args.semester_id,
        semester_name=args.semester_name,
    )

    sections = result["sections"]
    unique_courses = len(set(s["courseCode"] for s in sections))
    subjects = sorted(set(s["subject"] for s in sections))

    # Instructor cleanup summary
    multi_instructor = [s for s in sections if ',' in s["instructor"]]
    print(f"  Multi-instructor sections: {len(multi_instructor)} (names split & joined with commas)")

    if args.force_refresh:
        dv_path = PROJECT_ROOT / "public" / "data-version.json"
        if dv_path.exists():
            with open(dv_path) as f:
                dv = json.load(f)
            dv["dataVersion"] = dv.get("dataVersion", 0) + 1
        else:
            dv = {"dataVersion": 1}
        with open(dv_path, "w") as f:
            json.dump(dv, f, separators=(",", ":"))
        print(f"  dataVersion bumped to {dv['dataVersion']}")

    print(f"Done!")
    print(f"  Total sections: {len(sections)}")
    print(f"  Total courses:  {unique_courses}")
    print(f"  Subjects:       {', '.join(subjects)}")
    print(f"  Output written to: {output_path}")


if __name__ == "__main__":
    main()
