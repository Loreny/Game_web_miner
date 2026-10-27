/**
 * Number and currency formatting utilities matching Android Kotlin prototype.
 */
export function formatNumber(value: number): string {
  if (value < 0) return `-${formatNumber(-value)}`;
  if (!Number.isFinite(value)) return '0.00';

  if (value >= 1e15) return `${(value / 1e15).toFixed(2)} Qa`;
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} K`;
  if (value >= 100) return Math.floor(value).toString();
  if (value >= 1) return value.toFixed(2);
  if (value > 0) return value.toFixed(3);
  return '0.00';
}

export function formatCash(value: number): string {
  return `$${formatNumber(value)}`;
}

export function formatGrams(value: number): string {
  return `${formatNumber(value)} g`;
}
