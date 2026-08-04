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
import {
  comparePortfolioPositions,
  compareViolations
} from "./ordering"

export const detectSuitabilityViolations = (
  portfolio: Portfolio,
  constraints: SuitabilityConstraints
): ReadonlyArray<Violation> => {
  const positions = [...portfolio.positions].sort(comparePortfolioPositions)
  const positionViolations: ReadonlyArray<Violation> = positionsWithWeights(
    positions
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

  const actualCashPct = allocationByAssetClass(positions).cash
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

  return [...positionViolations, ...cashViolation].sort(compareViolations)
}
