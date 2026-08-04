import { describe, expect, it } from "vitest"

import {
  Portfolio,
  PortfolioPosition,
  type AssetClass
} from "../../lib/domain/portfolio"
import { proposeRebalancing } from "../../lib/rebalance/propose"
import type { RebalancingProfile } from "../../lib/rebalance/types"

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

const portfolio = (
  positions: ReadonlyArray<PortfolioPosition>
): Portfolio => new Portfolio({ positions })

const profile = (
  modelTarget: RebalancingProfile["modelTarget"],
  constraints: Pick<
    RebalancingProfile,
    "minCashPct" | "maxSinglePositionPct"
  >
): RebalancingProfile => ({ modelTarget, ...constraints })

describe("proposeRebalancing", () => {
  it("sells an oversized position below its asset-class target to satisfy the position limit", () => {
    const proposal = proposeRebalancing(
      portfolio([
        position("GOV", "government_bond", 500),
        position("EQ-1", "equity", 100),
        position("EQ-2", "equity", 100),
        position("EQ-3", "equity", 100),
        position("EQ-4", "equity", 100),
        position("CASH", "cash", 100)
      ]),
      profile(
        {
          equity: 65,
          government_bond: 25,
          corporate_bond: 0,
          commodity: 0,
          cash: 10
        },
        { maxSinglePositionPct: 15, minCashPct: 10 }
      )
    )

    expect(
      proposal.trades.find((trade) => trade.instrument.isin === "GOV")
    ).toMatchObject({ action: "sell", amountEUR: 350 })
    expect(proposal.afterAllocation.government_bond).toBeCloseTo(15)
    expect(proposal.deferred).toContainEqual({
      instrument: {
        isin: "GOV",
        name: "GOV",
        assetClass: "government_bond"
      },
      amountEUR: 100,
      reason: "The single-position limit prevents this adjustment."
    })
  })

  it("uses the combined balance of every cash position as purchase capacity", () => {
    const proposal = proposeRebalancing(
      portfolio([
        position("EQ", "equity", 200),
        position("CASH-1", "cash", 100),
        position("CASH-2", "cash", 100)
      ]),
      profile(
        {
          equity: 75,
          government_bond: 0,
          corporate_bond: 0,
          commodity: 0,
          cash: 25
        },
        { maxSinglePositionPct: 100, minCashPct: 25 }
      )
    )

    expect(proposal.trades).toEqual([
      {
        instrument: { isin: "EQ", name: "EQ", assetClass: "equity" },
        action: "buy",
        amountEUR: 100,
        rationale: "Increase equity toward its target allocation."
      }
    ])
    expect(proposal.afterAllocation.equity).toBeCloseTo(75)
    expect(proposal.afterAllocation.cash).toBeCloseTo(25)
    expect(proposal.deferred).toEqual([])
  })

  it("preserves and reinvests sale proceeds when the portfolio has no cash position", () => {
    const proposal = proposeRebalancing(
      portfolio([
        position("EQ", "equity", 800),
        position("GOV", "government_bond", 200)
      ]),
      profile(
        {
          equity: 50,
          government_bond: 50,
          corporate_bond: 0,
          commodity: 0,
          cash: 0
        },
        { maxSinglePositionPct: 100, minCashPct: 0 }
      )
    )

    expect(proposal.trades.map(({ action, instrument, amountEUR }) => ({
      action,
      isin: instrument.isin,
      amountEUR
    }))).toEqual([
      { action: "sell", isin: "EQ", amountEUR: 300 },
      { action: "buy", isin: "GOV", amountEUR: 300 }
    ])
    expect(proposal.afterAllocation).toEqual({
      equity: 50,
      government_bond: 50,
      corporate_bond: 0,
      commodity: 0,
      cash: 0
    })
  })

  it("defers a target allocation when its asset class has no existing position", () => {
    const proposal = proposeRebalancing(
      portfolio([
        position("EQ", "equity", 500),
        position("CASH", "cash", 500)
      ]),
      profile(
        {
          equity: 40,
          government_bond: 20,
          corporate_bond: 0,
          commodity: 0,
          cash: 40
        },
        { maxSinglePositionPct: 100, minCashPct: 40 }
      )
    )

    expect(proposal.deferred).toContainEqual({
      assetClass: "government_bond",
      amountEUR: 200,
      reason: "No existing position is available for this asset class."
    })
    expect(
      Object.values(proposal.afterAllocation).reduce(
        (total, allocation) => total + allocation,
        0
      )
    ).toBeCloseTo(100)
  })

  it("raises cash to a minimum above the model cash target", () => {
    const proposal = proposeRebalancing(
      portfolio([
        position("EQ", "equity", 450),
        position("GOV", "government_bond", 250),
        position("CORP", "corporate_bond", 150),
        position("COM", "commodity", 70),
        position("CASH", "cash", 80)
      ]),
      profile(
        {
          equity: 45,
          government_bond: 25,
          corporate_bond: 15,
          commodity: 7,
          cash: 8
        },
        { maxSinglePositionPct: 100, minCashPct: 20 }
      )
    )

    expect(proposal.trades).toContainEqual({
      instrument: { isin: "EQ", name: "EQ", assetClass: "equity" },
      action: "sell",
      amountEUR: 120,
      rationale: "Increase cash to satisfy the minimum cash allocation."
    })
    expect(proposal.afterAllocation.cash).toBeCloseTo(20)
    expect(proposal.deferred).toContainEqual({
      instrument: { isin: "EQ", name: "EQ", assetClass: "equity" },
      amountEUR: 120,
      reason: "The minimum cash allocation prevents this adjustment."
    })
  })

  it("sells an oversized cash position without reducing total cash", () => {
    const cash = position("CASH", "cash", 300)
    const proposal = proposeRebalancing(
      portfolio([
        position("EQ", "equity", 250),
        position("GOV", "government_bond", 200),
        position("CORP", "corporate_bond", 150),
        position("COM", "commodity", 100),
        cash
      ]),
      profile(
        {
          equity: 25,
          government_bond: 20,
          corporate_bond: 15,
          commodity: 10,
          cash: 30
        },
        { maxSinglePositionPct: 25, minCashPct: 20 }
      )
    )

    expect(proposal.trades).toEqual([
      {
        instrument: { isin: "CASH", name: "CASH", assetClass: "cash" },
        action: "sell",
        amountEUR: 50,
        rationale: "Reduce cash to satisfy the single-position limit."
      }
    ])
    expect(proposal.afterAllocation.cash).toBeCloseTo(30)
    expect(proposal.violations).toContainEqual({
      constraint: "maxSinglePositionPct",
      position: cash,
      actualPct: 30,
      limitPct: 25
    })
  })

  it("ignores floating-point residuals at constraint boundaries", () => {
    const proposal = proposeRebalancing(
      portfolio([
        position("EQ", "equity", 0.006412000000000001),
        position("GOV", "government_bond", 0.00458),
        position("CORP", "corporate_bond", 0.00458),
        position("COM", "commodity", 0.005038),
        position("CASH", "cash", 0.00229)
      ]),
      profile(
        {
          equity: 28,
          government_bond: 20,
          corporate_bond: 20,
          commodity: 22,
          cash: 10
        },
        { maxSinglePositionPct: 28, minCashPct: 10 }
      )
    )

    expect(proposal.beforeAllocation.equity).toBeGreaterThan(28)
    expect(proposal.beforeAllocation.cash).toBeLessThan(10)
    expect(proposal.violations).toEqual([])
  })
})
