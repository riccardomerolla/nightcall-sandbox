import type { MiFIDProfile } from "../domain/mifid"
import { MODEL_TARGET_ALLOCATION_PERCENTAGES } from "../domain/models"
import {
  ASSET_CLASSES,
  type AssetClass,
  type Portfolio
} from "../domain/portfolio"
import {
  detectSuitabilityViolations as detectRebalancingSuitabilityViolations
} from "../rebalance/suitability"
import type { Violation as SuitabilityViolation } from "../rebalance/types"
import { allocationByAssetClass } from "./allocation"
import { zeroIfWithinDeviationTolerance } from "./percentage-comparison"

export interface AllocationDeviation {
  readonly assetClass: AssetClass
  readonly actualPct: number
  readonly targetPct: number
  readonly deviationPct: number
}

export type { Violation as SuitabilityViolation } from "../rebalance/types"

export interface SuitabilityReport {
  readonly deviations: ReadonlyArray<AllocationDeviation>
  readonly violations: ReadonlyArray<SuitabilityViolation>
}

export const detectSuitabilityViolations = (
  portfolio: Portfolio,
  mifidProfile: MiFIDProfile
): ReadonlyArray<SuitabilityViolation> =>
  detectRebalancingSuitabilityViolations(portfolio, mifidProfile.constraints)

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
