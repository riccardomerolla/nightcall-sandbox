import type { PortfolioPosition } from "../domain/portfolio"

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
