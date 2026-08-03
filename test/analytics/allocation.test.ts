import { describe, expect, it } from "vitest"

import {
  allocationByAssetClass,
  positionWeights,
  positionsWithWeights
} from "../../lib/analytics/allocation"
import {
  PortfolioPosition,
  type AssetClass
} from "../../lib/domain/portfolio"

const position = (
  isin: string,
  assetClass: AssetClass,
  quantity: number,
  priceEur: number
): PortfolioPosition =>
  new PortfolioPosition({
    isin,
    name: isin,
    assetClass,
    quantity,
    priceEur,
    currency: "EUR"
  })

describe("positionWeights", () => {
  it("keeps each calculated weight associated with its position", () => {
    const equity = position("EQ", "equity", 2, 100)
    const cash = position("CASH", "cash", 3, 100)

    expect(positionsWithWeights([equity, cash])).toEqual([
      { position: equity, weightPct: 40 },
      { position: cash, weightPct: 60 }
    ])
  })

  it("calculates value-based weights for a multi-asset-class portfolio", () => {
    const weights = positionWeights([
      position("EQ", "equity", 2, 100),
      position("GOV", "government_bond", 4, 50),
      position("CASH", "cash", 1, 100)
    ])

    expect(weights).toEqual([40, 40, 20])
    expect(weights.reduce((total, weight) => total + weight, 0)).toBe(100)
  })

  it("calculates weights for a single-asset-class portfolio", () => {
    expect(
      positionWeights([
        position("EQ-1", "equity", 3, 100),
        position("EQ-2", "equity", 1, 100)
      ])
    ).toEqual([75, 25])
  })

  it("preserves fractional weights", () => {
    const weights = positionWeights([
      position("EQ", "equity", 1, 100),
      position("GOV", "government_bond", 2, 100)
    ])

    expect(weights[0]).toBeCloseTo(100 / 3)
    expect(weights[1]).toBeCloseTo(200 / 3)
    expect(weights.reduce((total, weight) => total + weight, 0)).toBeCloseTo(100)
  })

  it("assigns zero weight to a zero-value position in a nonzero portfolio", () => {
    expect(
      positionWeights([
        position("EQ", "equity", 2, 0),
        position("GOV", "government_bond", 1, 100),
        position("CASH", "cash", 3, 100)
      ])
    ).toEqual([0, 25, 75])
  })

  it("returns no weights for an empty portfolio", () => {
    expect(positionWeights([])).toEqual([])
  })

  it("returns one zero weight per position for a zero-value portfolio", () => {
    const weights = positionWeights([
      position("EQ", "equity", 2, 0),
      position("CASH", "cash", 1, 0)
    ])

    expect(weights).toEqual([0, 0])
    expect(weights.every(Number.isFinite)).toBe(true)
  })
})

describe("allocationByAssetClass", () => {
  it("calculates value-based allocations for a multi-asset-class portfolio", () => {
    const allocations = allocationByAssetClass([
      position("EQ-1", "equity", 1, 100),
      position("EQ-2", "equity", 2, 100),
      position("GOV", "government_bond", 4, 75),
      position("CORP", "corporate_bond", 2, 100),
      position("COM", "commodity", 1, 100),
      position("CASH", "cash", 1, 100)
    ])

    expect(allocations).toEqual({
      equity: 30,
      government_bond: 30,
      corporate_bond: 20,
      commodity: 10,
      cash: 10
    })
    expect(
      Object.values(allocations).reduce(
        (total, allocation) => total + allocation,
        0
      )
    ).toBeCloseTo(100)
  })

  it("calculates allocations for a single-asset-class portfolio", () => {
    expect(
      allocationByAssetClass([
        position("EQ-1", "equity", 3, 100),
        position("EQ-2", "equity", 1, 100)
      ])
    ).toEqual({
      equity: 100,
      government_bond: 0,
      corporate_bond: 0,
      commodity: 0,
      cash: 0
    })
  })

  it("returns zero for every asset class for an empty portfolio", () => {
    expect(allocationByAssetClass([])).toEqual({
      equity: 0,
      government_bond: 0,
      corporate_bond: 0,
      commodity: 0,
      cash: 0
    })
  })

  it("returns finite zero allocations for a non-empty zero-value portfolio", () => {
    const allocations = allocationByAssetClass([
      position("EQ", "equity", 2, 0),
      position("GOV", "government_bond", 1, 0),
      position("CASH", "cash", 3, 0)
    ])

    expect(allocations).toEqual({
      equity: 0,
      government_bond: 0,
      corporate_bond: 0,
      commodity: 0,
      cash: 0
    })
    expect(Object.values(allocations).every(Number.isFinite)).toBe(true)
  })
})
