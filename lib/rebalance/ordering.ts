import {
  ASSET_CLASSES,
  type AssetClass,
  type PortfolioPosition
} from "../domain/portfolio"
import type {
  DeferredAdjustment,
  InstrumentReference,
  Trade,
  Violation
} from "./types"

const assetClassOrder = new Map<AssetClass, number>(
  ASSET_CLASSES.map((assetClass, index) => [assetClass, index])
)

const compareNumbers = (left: number, right: number): number => left - right

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

export const compareAssetClasses = (
  left: AssetClass,
  right: AssetClass
): number =>
  compareNumbers(assetClassOrder.get(left) ?? 0, assetClassOrder.get(right) ?? 0)

export const compareInstrumentReferences = (
  left: InstrumentReference,
  right: InstrumentReference
): number =>
  compareAssetClasses(left.assetClass, right.assetClass) ||
  compareText(left.isin, right.isin) ||
  compareText(left.name, right.name)

export const comparePortfolioPositions = (
  left: PortfolioPosition,
  right: PortfolioPosition
): number =>
  compareInstrumentReferences(left, right) ||
  compareNumbers(left.quantity, right.quantity) ||
  compareNumbers(left.priceEur, right.priceEur) ||
  compareText(left.currency, right.currency)

export const compareTrades = (left: Trade, right: Trade): number =>
  compareNumbers(
    left.action === "sell" ? 0 : 1,
    right.action === "sell" ? 0 : 1
  ) ||
  compareAssetClasses(left.instrument.assetClass, right.instrument.assetClass) ||
  compareNumbers(right.amountEUR, left.amountEUR) ||
  compareInstrumentReferences(left.instrument, right.instrument) ||
  compareText(left.rationale, right.rationale)

const deferredAssetClass = (adjustment: DeferredAdjustment): AssetClass =>
  "instrument" in adjustment
    ? adjustment.instrument.assetClass
    : adjustment.assetClass

const compareDeferredTargets = (
  left: DeferredAdjustment,
  right: DeferredAdjustment
): number => {
  if ("instrument" in left && "instrument" in right) {
    return compareInstrumentReferences(left.instrument, right.instrument)
  }

  if ("instrument" in left) {
    return -1
  }

  if ("instrument" in right) {
    return 1
  }

  return 0
}

export const compareDeferredAdjustments = (
  left: DeferredAdjustment,
  right: DeferredAdjustment
): number =>
  compareAssetClasses(deferredAssetClass(left), deferredAssetClass(right)) ||
  compareDeferredTargets(left, right) ||
  compareNumbers(left.amountEUR, right.amountEUR) ||
  compareText(left.reason, right.reason)

export const compareViolations = (
  left: Violation,
  right: Violation
): number => {
  const constraintOrder =
    compareNumbers(
      left.constraint === "maxSinglePositionPct" ? 0 : 1,
      right.constraint === "maxSinglePositionPct" ? 0 : 1
    )

  if (constraintOrder !== 0) {
    return constraintOrder
  }

  if (
    left.constraint === "maxSinglePositionPct" &&
    right.constraint === "maxSinglePositionPct"
  ) {
    return (
      comparePortfolioPositions(left.position, right.position) ||
      compareNumbers(left.actualPct, right.actualPct) ||
      compareNumbers(left.limitPct, right.limitPct)
    )
  }

  return (
    compareNumbers(left.actualPct, right.actualPct) ||
    compareNumbers(left.limitPct, right.limitPct)
  )
}
