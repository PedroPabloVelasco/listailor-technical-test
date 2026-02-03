const CHILE_OFFSET_HOURS = -3;
const MILLIS_PER_HOUR = 60 * 60 * 1000;

function toChileDate(date: Date): Date {
  const utcMillis = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utcMillis + CHILE_OFFSET_HOURS * MILLIS_PER_HOUR);
}

export function formatChileRelative(ts: string | null): string {
  if (!ts) return 'Sin registro';
  const target = toChileDate(new Date(ts));
  if (Number.isNaN(target.getTime())) return 'Sin registro';
  const now = toChileDate(new Date());
  const diffMs = now.getTime() - target.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
  if (minutes < 1) return 'Hace instantes';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} d`;
  return formatChileAbsolute(ts);
}

export function formatChileAbsolute(ts: string | null): string {
  if (!ts) return 'Sin registro';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
  }).format(date);
}
