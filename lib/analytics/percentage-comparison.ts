// Percentage division can leave tiny residuals around mathematically equal
// values. This tolerance is far below any meaningful reporting precision.
const PERCENTAGE_COMPARISON_TOLERANCE_PCT = 1e-10

export const zeroIfWithinDeviationTolerance = (
  deviationPct: number
): number =>
  Math.abs(deviationPct) <= PERCENTAGE_COMPARISON_TOLERANCE_PCT
    ? 0
    : deviationPct

export const exceedsMaximumBeyondTolerance = (
  actualPct: number,
  maximumPct: number
): boolean =>
  actualPct - maximumPct > PERCENTAGE_COMPARISON_TOLERANCE_PCT

export const fallsBelowMinimumBeyondTolerance = (
  actualPct: number,
  minimumPct: number
): boolean =>
  minimumPct - actualPct > PERCENTAGE_COMPARISON_TOLERANCE_PCT
