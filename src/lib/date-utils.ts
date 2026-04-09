// packages/coaching-web/src/lib/date-utils.ts
// Date utilities extracted from Elaubody, adapted for coaching platform

export const TIMEZONE = 'Europe/Paris';

/** Convert JS getDay() (0=Sun) to ISO day (1=Mon..7=Sun) */
export function jsToIsoDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

/** Current time in Paris timezone */
export function getNowParis(): Date {
  const now = new Date();
  const parisStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(parisStr);
}

/** Add minutes to a "HH:MM" time string, return "HH:MM" */
export function addMinutesToTime(time: string, minutes: number): string {
  const total = timeToMinutes(time) + minutes;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Convert "HH:MM" or "HH:MM:SS" to total minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.substring(0, 5).split(':').map(Number);
  return h * 60 + m;
}

/** Format a date string as French locale */
export function formatDateFR(date: string): string {
  const d = new Date(date + 'T12:00:00');
  const formatted = d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
