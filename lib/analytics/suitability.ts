import type { MiFIDProfile } from "../domain/mifid"
import { MODEL_TARGET_ALLOCATION_PERCENTAGES } from "../domain/models"
import type {
  AssetClass,
  Portfolio,
  PortfolioPosition
} from "../domain/portfolio"
import { allocationByAssetClass, positionsWithWeights } from "./allocation"

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

const modelAssetClasses = [
  "equity",
  "government_bond",
  "corporate_bond",
  "commodity",
  "cash"
] as const satisfies ReadonlyArray<AssetClass>

// Percentage division can leave tiny residuals around mathematically equal
// values. This tolerance is far below any meaningful reporting precision and is
// used only when comparing percentages; reported actual allocations retain their
// full precision.
const PERCENTAGE_COMPARISON_TOLERANCE_PCT = 1e-10

const zeroIfWithinDeviationTolerance = (deviationPct: number): number =>
  Math.abs(deviationPct) <= PERCENTAGE_COMPARISON_TOLERANCE_PCT
    ? 0
    : deviationPct

const exceedsMaximumBeyondTolerance = (
  actualPct: number,
  maximumPct: number
): boolean =>
  actualPct - maximumPct > PERCENTAGE_COMPARISON_TOLERANCE_PCT

const fallsBelowMinimumBeyondTolerance = (
  actualPct: number,
  minimumPct: number
): boolean =>
  minimumPct - actualPct > PERCENTAGE_COMPARISON_TOLERANCE_PCT

export const suitabilityReport = (
  portfolio: Portfolio,
  mifidProfile: MiFIDProfile
): SuitabilityReport => {
  const actualAllocation = allocationByAssetClass(portfolio.positions)
  const targetAllocation =
    MODEL_TARGET_ALLOCATION_PERCENTAGES[mifidProfile.riskProfile]
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
  const minimumCashPct = mifidProfile.constraints.minCashPct
  const cashViolation: ReadonlyArray<SuitabilityViolation> =
    fallsBelowMinimumBeyondTolerance(actualAllocation.cash, minimumCashPct)
      ? [
        {
          constraint: "minCashPct",
          assetClass: "cash",
          actualPct: actualAllocation.cash,
          limitPct: minimumCashPct
        }
      ]
      : []

  return {
    deviations: modelAssetClasses.map((assetClass) => {
      const actualPct = actualAllocation[assetClass]
      const targetPct = targetAllocation[assetClass]

      return {
        assetClass,
        actualPct,
        targetPct,
        deviationPct: zeroIfWithinDeviationTolerance(actualPct - targetPct)
      }
    }),
    violations: [...positionViolations, ...cashViolation]
  }
}
