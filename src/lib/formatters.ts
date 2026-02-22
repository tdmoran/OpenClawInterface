/**
 * Format a token count with k/M suffixes for compact display.
 *
 * Examples:
 *   formatTokenCount(500)       -> "500"
 *   formatTokenCount(1_234)     -> "1.2k"
 *   formatTokenCount(2_345_678) -> "2.3M"
 */
export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toLocaleString();
}

/**
 * Format a dollar amount with appropriate precision.
 *
 * Examples:
 *   formatCost(0)      -> "$0.00"
 *   formatCost(0.0012) -> "$0.0012"
 *   formatCost(0.05)   -> "$0.050"
 *   formatCost(3.14)   -> "$3.14"
 */
export function formatCost(amount: number): string {
  if (amount >= 1) return `$${amount.toFixed(2)}`;
  if (amount >= 0.01) return `$${amount.toFixed(3)}`;
  if (amount > 0) return `$${amount.toFixed(4)}`;
  return '$0.00';
}
