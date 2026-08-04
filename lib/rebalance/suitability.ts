import { allocationByAssetClass, positionsWithWeights } from "../analytics/allocation"
import {
  exceedsMaximumBeyondTolerance,
  fallsBelowMinimumBeyondTolerance
} from "../analytics/percentage-comparison"
import type {
  Portfolio,
  SuitabilityConstraints,
  Violation
} from "./types"

export const detectSuitabilityViolations = (
  portfolio: Portfolio,
  constraints: SuitabilityConstraints
): ReadonlyArray<Violation> => {
  const positionViolations: ReadonlyArray<Violation> = positionsWithWeights(
    portfolio.positions
  ).flatMap(({ position, weightPct: actualPct }) =>
    exceedsMaximumBeyondTolerance(
      actualPct,
      constraints.maxSinglePositionPct
    )
      ? [
          {
            constraint: "maxSinglePositionPct",
            position,
            actualPct,
            limitPct: constraints.maxSinglePositionPct
          }
        ]
      : []
  )

  const actualCashPct = allocationByAssetClass(portfolio.positions).cash
  const cashViolation: ReadonlyArray<Violation> =
    fallsBelowMinimumBeyondTolerance(actualCashPct, constraints.minCashPct)
      ? [
          {
            constraint: "minCashPct",
            assetClass: "cash",
            actualPct: actualCashPct,
            limitPct: constraints.minCashPct
          }
        ]
      : []

  return [...positionViolations, ...cashViolation]
}
