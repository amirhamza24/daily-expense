const currency = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234.5 -> "$1,234.50" (sign handled by caller) */
export function formatMoney(value: number) {
  return `$${currency.format(Math.abs(value))}`;
}

export function formatDate(
  value: Date | string,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
) {
  return new Date(value).toLocaleDateString('en-US', opts);
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}
