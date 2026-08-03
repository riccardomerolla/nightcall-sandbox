const MAX_DECIMALS = 20

/**
 * Formats a value already expressed in percentage points (for example, 12.3 as
 * 12.3%, not 0.123 as 12.3%). Precision must be an integer from 0 through 20.
 */
export const formatPercent = (value: number, decimals = 1): string => {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
    throw new RangeError(`decimals must be an integer from 0 to ${MAX_DECIMALS}`)
  }

  return `${new Intl.NumberFormat("en-IE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)}%`
}
