import type { MiFIDProfile } from "../domain/mifid"
import { MODEL_TARGET_ALLOCATION_PERCENTAGES } from "../domain/models"
import {
  ASSET_CLASSES,
  type AssetClass,
  type Portfolio,
  type PortfolioPosition
} from "../domain/portfolio"
import { allocationByAssetClass, positionsWithWeights } from "./allocation"
import {
  exceedsMaximumBeyondTolerance,
  fallsBelowMinimumBeyondTolerance,
  zeroIfWithinDeviationTolerance
} from "./percentage-comparison"

export interface AllocationDeviation {
  readonly assetClass: AssetClass
  readonly actualPct: number
  readonly targetPct: number
  readonly deviationPct: number
}

export type SuitabilityViolation =
  | {
    readonly constraint: "maxSinglePositionPct"
    readonly position: PortfolioPosition
    readonly actualPct: number
    readonly limitPct: number
  }
  | {
    readonly constraint: "minCashPct"
    readonly assetClass: "cash"
    readonly actualPct: number
    readonly limitPct: number
  }

export interface SuitabilityReport {
  readonly deviations: ReadonlyArray<AllocationDeviation>
  readonly violations: ReadonlyArray<SuitabilityViolation>
}

export const detectSuitabilityViolations = (
  portfolio: Portfolio,
  mifidProfile: MiFIDProfile
): ReadonlyArray<SuitabilityViolation> => {
  const positionLimitPct = mifidProfile.constraints.maxSinglePositionPct
  const positionViolations: ReadonlyArray<SuitabilityViolation> =
    positionsWithWeights(portfolio.positions).flatMap(
      ({ position, weightPct: actualPct }) =>
        exceedsMaximumBeyondTolerance(actualPct, positionLimitPct)
          ? [
            {
              constraint: "maxSinglePositionPct",
              position,
              actualPct,
              limitPct: positionLimitPct
            }
          ]
          : []
    )

  const actualCashPct = allocationByAssetClass(portfolio.positions).cash
  const minimumCashPct = mifidProfile.constraints.minCashPct
  const cashViolation: ReadonlyArray<SuitabilityViolation> =
    fallsBelowMinimumBeyondTolerance(actualCashPct, minimumCashPct)
      ? [
        {
          constraint: "minCashPct",
          assetClass: "cash",
          actualPct: actualCashPct,
          limitPct: minimumCashPct
        }
      ]
      : []

  return [...positionViolations, ...cashViolation]
}

export const suitabilityReport = (
  portfolio: Portfolio,
  mifidProfile: MiFIDProfile
): SuitabilityReport => {
  const actualAllocation = allocationByAssetClass(portfolio.positions)
  const targetAllocation =
    MODEL_TARGET_ALLOCATION_PERCENTAGES[mifidProfile.riskProfile]

  return {
    deviations: ASSET_CLASSES.map((assetClass) => {
      const actualPct = actualAllocation[assetClass]
      const targetPct = targetAllocation[assetClass]

      return {
        assetClass,
        actualPct,
        targetPct,
        deviationPct: zeroIfWithinDeviationTolerance(actualPct - targetPct)
      }
    }),
    violations: detectSuitabilityViolations(portfolio, mifidProfile)
  }
}
