export interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  durationMinutes: number;
  location?: string;
}

function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function foldLine(line: string): string {
  // RFC 5545: lines must be folded at 75 octets
  const result: string[] = [];
  while (line.length > 75) {
    result.push(line.slice(0, 75));
    line = ' ' + line.slice(75);
  }
  result.push(line);
  return result.join('\r\n');
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function generateICS(events: CalendarEvent[], calendarName: string): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pulse Fitness//Programme//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeICSText(calendarName)}`),
    'X-WR-TIMEZONE:Europe/Paris',
  ];

  for (const event of events) {
    const uid = `${simpleHash(event.title + event.startDate.toISOString())}@pulse.fitness`;
    const endDate = new Date(event.startDate.getTime() + event.durationMinutes * 60 * 1000);

    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${uid}`));
    lines.push(`DTSTAMP:${toICSDate(new Date())}`);
    lines.push(`DTSTART:${toICSDate(event.startDate)}`);
    lines.push(`DTEND:${toICSDate(endDate)}`);
    lines.push(foldLine(`SUMMARY:${escapeICSText(event.title)}`));
    lines.push(foldLine(`DESCRIPTION:${escapeICSText(event.description)}`));
    if (event.location) {
      lines.push(foldLine(`LOCATION:${escapeICSText(event.location)}`));
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}
