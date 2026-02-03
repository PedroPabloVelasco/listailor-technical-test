const CHILE_LOCALE = 'es-CL';
const CHILE_TIMEZONE = 'America/Santiago';

export function formatChileDateTime(
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date =
    value instanceof Date ? value : new Date(typeof value === 'number' ? value : Date.parse(value));

  if (Number.isNaN(date.getTime())) {
    return 'Sin registro';
  }

  const formatter = new Intl.DateTimeFormat(CHILE_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: CHILE_TIMEZONE,
    ...options,
  });

  return formatter.format(date);
}

export function formatChileDate(value: string | number | Date): string {
  return formatChileDateTime(value, { dateStyle: 'long', timeStyle: undefined });
}

export const CHILE_TIME_LABEL = 'Horario Chile (UTC-3)';
