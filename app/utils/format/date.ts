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

const padTwo = (value: number): string => String(value).padStart(2, "0");

/**
 * Local `YYYY-MM-DD` value for `<input type="date">`.
 * Uses the local timezone parts so the picked day never shifts by UTC offset.
 */
export const toLocalDateInputValue = (
  value: string | number | Date = new Date(),
): string => {
  const date = toValidDate(value);
  if (!date) return "";

  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
};

/** Local `YYYY-MM-DDTHH:mm` value for `<input type="datetime-local">`. */
export const toLocalDateTimeInputValue = (
  value: string | number | Date = new Date(),
): string => {
  const date = toValidDate(value);
  if (!date) return "";

  return `${toLocalDateInputValue(date)}T${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
};
