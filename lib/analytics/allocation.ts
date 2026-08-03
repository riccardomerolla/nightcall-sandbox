import type { AssetClass, PortfolioPosition } from "../domain/portfolio"

type AssetClassAllocation = Readonly<Record<AssetClass, number>>

const emptyAssetClassAllocation = (): Record<AssetClass, number> => ({
  equity: 0,
  government_bond: 0,
  corporate_bond: 0,
  commodity: 0,
  cash: 0
})

export const positionWeights = (
  positions: ReadonlyArray<PortfolioPosition>
): ReadonlyArray<number> => {
  const values = positions.map(({ quantity, priceEur }) => quantity * priceEur)
  const totalValue = values.reduce((total, value) => total + value, 0)

  if (totalValue === 0) {
    return values.map(() => 0)
  }

  return values.map((value) => (value / totalValue) * 100)
}

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
