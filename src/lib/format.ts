/**
 * French date and number formatting — human language throughout.
 * "12 mars 2026", "il y a 3 jours", "+2,5 kg"
 */

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const DAYS_FR = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

/** "12 mars 2026" */
export function formatDateFr(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Lundi 12 mars 2026" */
export function formatDateLongFr(dateStr: string): string {
  const d = new Date(dateStr);
  const day = DAYS_FR[d.getDay()];
  return `${day.charAt(0).toUpperCase() + day.slice(1)} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

/** "il y a 3 jours", "aujourd'hui", "hier" */
export function timeAgoFr(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `il y a ${months} mois`;
  }
  const years = Math.floor(diffDays / 365);
  return `il y a ${years} an${years > 1 ? 's' : ''}`;
}

/** "+2,5" or "-1,2" — French decimal separator */
export function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1).replace('.', ',')}`;
}

/** "1 250 €" — French number with spaces */
export function formatNumber(value: number): string {
  return value.toLocaleString('fr-FR');
}

/** Build a human sentence for weight change */
export function weightSentence(name: string, delta: number, periodLabel: string): string {
  if (Math.abs(delta) < 0.1) return `${name} a un poids stable ${periodLabel}`;
  const verb = delta < 0 ? 'a perdu' : 'a pris';
  return `${name} ${verb} ${Math.abs(delta).toFixed(1).replace('.', ',')} kg ${periodLabel}`;
}

/** Build a human sentence for session frequency */
export function frequencySentence(count: number, prevCount: number, periodLabel: string): string {
  const diff = count - prevCount;
  if (diff === 0) return `${count} séance${count > 1 ? 's' : ''} ${periodLabel}, comme la période précédente`;
  const direction = diff > 0 ? 'de plus' : 'de moins';
  return `${count} séance${count > 1 ? 's' : ''} ${periodLabel}, ${Math.abs(diff)} ${direction} qu'avant`;
}
