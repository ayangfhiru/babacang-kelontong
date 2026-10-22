const toValidDate = (value: string | number | Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Format a date as `22 Oktober 2026`. */
export const formatDate = (value: string | number | Date, locale = "id-ID"): string => {
  const date = toValidDate(value);
  if (!date) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

/** Format a date with time as `22 Okt 2026, 12.42`. */
export const formatDateTime = (value: string | number | Date, locale = "id-ID"): string => {
  const date = toValidDate(value);
  if (!date) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(":", ".");
};

/** Format a date with weekday as `Kamis, 22 Oktober 2026`. */
export const formatDayLabel = (value: string | number | Date, locale = "id-ID"): string => {
  const date = toValidDate(value);
  if (!date) return "-";

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};
