import { describe, expect, it } from "vitest"

import {
  Portfolio,
  PortfolioPosition,
  type AssetClass
} from "../../lib/domain/portfolio"
import { detectSuitabilityViolations } from "../../lib/rebalance/suitability"

const position = (
  isin: string,
  assetClass: AssetClass,
  valueEUR: number
): PortfolioPosition =>
  new PortfolioPosition({
    isin,
    name: isin,
    assetClass,
    quantity: 1,
    priceEur: valueEUR,
    currency: "EUR"
  })

describe("detectSuitabilityViolations", () => {
  it("reports a cash allocation below the required floor", () => {
    const portfolio = new Portfolio({
      positions: [
        position("EQUITY", "equity", 900),
        position("CASH", "cash", 100)
      ]
    })

    expect(
      detectSuitabilityViolations(portfolio, {
        maxSinglePositionPct: 100,
        minCashPct: 15
      })
    ).toEqual([
      {
        constraint: "minCashPct",
        assetClass: "cash",
        actualPct: 10,
        limitPct: 15
      }
    ])
  })

  it("reports every position above the single-position limit", () => {
    const firstOversizedPosition = position("EQUITY", "equity", 400)
    const secondOversizedPosition = position("BOND", "government_bond", 350)
    const portfolio = new Portfolio({
      positions: [
        firstOversizedPosition,
        secondOversizedPosition,
        position("CASH", "cash", 250)
      ]
    })

    expect(
      detectSuitabilityViolations(portfolio, {
        maxSinglePositionPct: 30,
        minCashPct: 20
      })
    ).toEqual([
      {
        constraint: "maxSinglePositionPct",
        position: firstOversizedPosition,
        actualPct: 40,
        limitPct: 30
      },
      {
        constraint: "maxSinglePositionPct",
        position: secondOversizedPosition,
        actualPct: 35,
        limitPct: 30
      }
    ])
  })
})
