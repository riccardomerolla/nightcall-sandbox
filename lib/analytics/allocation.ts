import type { AssetClass, PortfolioPosition } from "../domain/portfolio"

type AssetClassAllocation = Readonly<Record<AssetClass, number>>

export interface WeightedPosition {
  readonly position: PortfolioPosition
  readonly weightPct: number
}

const emptyAssetClassAllocation = (): Record<AssetClass, number> => ({
  equity: 0,
  government_bond: 0,
  corporate_bond: 0,
  commodity: 0,
  cash: 0
})

export const positionsWithWeights = (
  positions: ReadonlyArray<PortfolioPosition>
): ReadonlyArray<WeightedPosition> => {
  const valuedPositions = positions.map((position) => ({
    position,
    value: position.quantity * position.priceEur
  }))
  const totalValue = valuedPositions.reduce(
    (total, { value }) => total + value,
    0
  )

  return valuedPositions.map(({ position, value }) => ({
    position,
    weightPct: totalValue === 0 ? 0 : (value / totalValue) * 100
  }))
}

export const positionWeights = (
  positions: ReadonlyArray<PortfolioPosition>
): ReadonlyArray<number> =>
  positionsWithWeights(positions).map(({ weightPct }) => weightPct)

export const allocationByAssetClass = (
  positions: ReadonlyArray<PortfolioPosition>
): AssetClassAllocation => {
  const valuesByAssetClass = emptyAssetClassAllocation()

  for (const { assetClass, quantity, priceEur } of positions) {
    valuesByAssetClass[assetClass] += quantity * priceEur
  }

  const totalValue = Object.values(valuesByAssetClass).reduce(
    (total, value) => total + value,
    0
  )

  if (totalValue === 0) {
    return valuesByAssetClass
  }

  return {
    equity: (valuesByAssetClass.equity / totalValue) * 100,
    government_bond:
      (valuesByAssetClass.government_bond / totalValue) * 100,
    corporate_bond:
      (valuesByAssetClass.corporate_bond / totalValue) * 100,
    commodity: (valuesByAssetClass.commodity / totalValue) * 100,
    cash: (valuesByAssetClass.cash / totalValue) * 100
  }
}
