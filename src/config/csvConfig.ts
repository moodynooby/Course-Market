// --- CSV HEADERS & PARSING ---
export const REQUIRED_CSV_HEADERS = [
  'Course Code',
  'Course Name',
  'Section',
  'Instructor',
  'Days',
  'Start Time',
  'End Time',
  'Credits',
] as const;

export const REQUIRED_HEADERS_LOWERCASE = REQUIRED_CSV_HEADERS.map((h) => h.toLowerCase());

export const HEADER_MAPPING: Record<string, string> = {
  'course code': 'courseCode',
  'course name': 'courseName',
  section: 'sectionNumber',
  instructor: 'instructor',
  days: 'days',
  'start time': 'startTime',
  'end time': 'endTime',
  credits: 'credits',
};

export const DAY_MAPPINGS: Record<string, string> = {
  monday: 'M',
  mon: 'M',
  tuesday: 'T',
  tue: 'T',
  tues: 'T',
  wednesday: 'W',
  wed: 'W',
  thursday: 'Th',
  thu: 'Th',
  thur: 'Th',
  thurs: 'Th',
  friday: 'F',
  fri: 'F',
  saturday: 'Sa',
  sat: 'Sa',
  sunday: 'Su',
  sun: 'Su',
};

export function parseDays(daysString: string): string[] {
  const days = daysString
    .toLowerCase()
    .replace(/[,\s]+/g, ' ')
    .split(' ')
    .filter(Boolean);

  return days
    .map((day) => DAY_MAPPINGS[day] || day)
    .join('')
    .split('');
}

export function parseTime(timeString: string): string {
  const cleanTime = timeString.trim().toLowerCase();
  const timeRegex = /^(\d{1,2}):?(\d{2})\s*(am|pm)?$/i;
  const match = cleanTime.match(timeRegex);

  if (!match) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  const [, hours, minutes, period] = match;
  const hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);

  if (period) {
    let convertedHour = hour;
    if (period.toLowerCase() === 'pm' && hour !== 12) {
      convertedHour = hour + 12;
    } else if (period.toLowerCase() === 'am' && hour === 12) {
      convertedHour = 0;
    }
    return `${convertedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
