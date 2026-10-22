/**
 * Format a number as Indonesian Rupiah, e.g. `Rp 24.580.000`.
 */
export const formatCurrency = (value: number, locale = "id-ID"): string => {
  if (!Number.isFinite(value)) return "-";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};
