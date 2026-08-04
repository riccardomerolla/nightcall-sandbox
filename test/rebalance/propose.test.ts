import { describe, expect, it } from "vitest"

import {
  ASSET_CLASSES,
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
  it("defers a sale below EUR 500 without changing the proposed allocation", () => {
    const proposal = proposeRebalancing(
      portfolio([
        position("EQ", "equity", 5_400),
        position("CASH", "cash", 4_600)
      ]),
      profile(
        {
          equity: 50,
          government_bond: 0,
          corporate_bond: 0,
          commodity: 0,
          cash: 50
        },
        { maxSinglePositionPct: 100, minCashPct: 0 }
      )
    )

    expect(proposal.trades).toEqual([])
    expect(proposal.deferred).toEqual([
      {
        instrument: { isin: "EQ", name: "EQ", assetClass: "equity" },
        amountEUR: 400,
        reason: "The adjustment is below the EUR 500 minimum trade amount."
      }
    ])
    expect(proposal.afterAllocation).toEqual(proposal.beforeAllocation)
  })

  it("defers a purchase below EUR 500 without changing the proposed allocation", () => {
    const proposal = proposeRebalancing(
      portfolio([
        position("EQ", "equity", 4_600),
        position("CASH", "cash", 5_400)
      ]),
      profile(
        {
          equity: 50,
          government_bond: 0,
          corporate_bond: 0,
          commodity: 0,
          cash: 50
        },
        { maxSinglePositionPct: 100, minCashPct: 0 }
      )
    )

    expect(proposal.trades).toEqual([])
    expect(proposal.deferred).toEqual([
      {
        instrument: { isin: "EQ", name: "EQ", assetClass: "equity" },
        amountEUR: 400,
        reason: "The adjustment is below the EUR 500 minimum trade amount."
      }
    ])
    expect(proposal.afterAllocation).toEqual(proposal.beforeAllocation)
  })

  it("executes an adjustment of exactly EUR 500", () => {
    const proposal = proposeRebalancing(
      portfolio([
        position("EQ", "equity", 4_500),
        position("CASH", "cash", 5_500)
      ]),
      profile(
        {
          equity: 50,
          government_bond: 0,
          corporate_bond: 0,
          commodity: 0,
          cash: 50
        },
        { maxSinglePositionPct: 100, minCashPct: 0 }
      )
    )

    expect(proposal.trades).toContainEqual({
      instrument: { isin: "EQ", name: "EQ", assetClass: "equity" },
      action: "buy",
      amountEUR: 500,
      rationale: "Increase equity toward its target allocation."
    })
    expect(proposal.deferred).toEqual([])
    expect(proposal.afterAllocation.equity).toBeCloseTo(50)
    expect(proposal.afterAllocation.cash).toBeCloseTo(50)
  })

  it("sells an oversized position below its asset-class target to satisfy the position limit", () => {
    const oversizedPosition = position("GOV", "government_bond", 5_000)
    const proposal = proposeRebalancing(
      portfolio([
        oversizedPosition,
        position("EQ-1", "equity", 1_000),
        position("EQ-2", "equity", 1_000),
        position("EQ-3", "equity", 1_000),
        position("EQ-4", "equity", 1_000),
        position("CASH", "cash", 1_000)
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
    ).toEqual({
      instrument: {
        isin: "GOV",
        name: "GOV",
        assetClass: "government_bond"
      },
      action: "sell",
      amountEUR: 3_500,
      rationale:
        "Reduce government bond to satisfy the single-position limit."
    })
    expect(proposal.violations).toContainEqual({
      constraint: "maxSinglePositionPct",
      position: oversizedPosition,
      actualPct: 50,
      limitPct: 15
    })
    expect(proposal.afterAllocation.government_bond).toBeCloseTo(15)
    expect(proposal.deferred).toContainEqual({
      instrument: {
        isin: "GOV",
        name: "GOV",
        assetClass: "government_bond"
      },
      amountEUR: 1_000,
      reason: "The single-position limit prevents this adjustment."
    })
  })

  it("uses the combined balance of every cash position as purchase capacity", () => {
    const proposal = proposeRebalancing(
      portfolio([
        position("EQ", "equity", 2_000),
        position("CASH-1", "cash", 1_000),
        position("CASH-2", "cash", 1_000)
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
        amountEUR: 1_000,
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
        position("EQ", "equity", 8_000),
        position("GOV", "government_bond", 2_000)
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
      { action: "sell", isin: "EQ", amountEUR: 3_000 },
      { action: "buy", isin: "GOV", amountEUR: 3_000 }
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
        position("EQ", "equity", 5_000),
        position("CASH", "cash", 5_000)
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
      amountEUR: 2_000,
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
        position("EQ", "equity", 4_500),
        position("GOV", "government_bond", 2_500),
        position("CORP", "corporate_bond", 1_500),
        position("COM", "commodity", 700),
        position("CASH", "cash", 800)
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
      amountEUR: 1_200,
      rationale: "Increase cash to satisfy the minimum cash allocation."
    })
    expect(proposal.trades).toContainEqual({
      instrument: { isin: "CASH", name: "CASH", assetClass: "cash" },
      action: "buy",
      amountEUR: 1_200,
      rationale: "Increase cash to satisfy the minimum cash allocation."
    })
    expect(proposal.afterAllocation.cash).toBeCloseTo(20)
    expect(proposal.violations).toContainEqual({
      constraint: "minCashPct",
      assetClass: "cash",
      actualPct: 8,
      limitPct: 20
    })
    expect(proposal.deferred).toContainEqual({
      instrument: { isin: "EQ", name: "EQ", assetClass: "equity" },
      amountEUR: 1_200,
      reason: "The minimum cash allocation prevents this adjustment."
    })
  })

  it("sells an oversized cash position without reducing total cash", () => {
    const cash = position("CASH", "cash", 3_000)
    const proposal = proposeRebalancing(
      portfolio([
        position("EQ", "equity", 2_500),
        position("GOV", "government_bond", 2_000),
        position("CORP", "corporate_bond", 1_500),
        position("COM", "commodity", 1_000),
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
        amountEUR: 500,
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

  it("returns canonically ordered proposals across repeated calls with tied positions", () => {
    const tiedPortfolio = portfolio([
      position("Z-CASH", "cash", 1_000),
      position("A-CASH", "cash", 1_000),
      position("Z-GOV", "government_bond", 1_000),
      position("A-GOV", "government_bond", 1_000),
      position("Z-EQ", "equity", 3_000),
      position("A-EQ", "equity", 3_000)
    ])
    const tiedProfile = profile(
      {
        equity: 45,
        government_bond: 25,
        corporate_bond: 5,
        commodity: 5,
        cash: 20
      },
      { maxSinglePositionPct: 25, minCashPct: 25 }
    )
    const proposals = Array.from({ length: 10 }, () =>
      proposeRebalancing(tiedPortfolio, tiedProfile)
    )

    expect(proposals).toEqual(
      Array.from({ length: 10 }, () => proposals[0])
    )
    expect(Object.keys(proposals[0]?.beforeAllocation ?? {})).toEqual(
      ASSET_CLASSES
    )
    expect(Object.keys(proposals[0]?.afterAllocation ?? {})).toEqual(
      ASSET_CLASSES
    )
    expect(proposals[0]?.beforeAllocation).toEqual({
      equity: 60,
      government_bond: 20,
      corporate_bond: 0,
      commodity: 0,
      cash: 20
    })
    expect(proposals[0]?.afterAllocation).toEqual({
      equity: 45,
      government_bond: 25,
      corporate_bond: 0,
      commodity: 0,
      cash: 30
    })
    expect(
      proposals[0]?.trades.map((trade) => [
        trade.action,
        trade.instrument.isin,
        trade.amountEUR,
        trade.rationale
      ])
    ).toEqual([
      ["sell", "A-EQ", 1_000, "Reduce equity toward its target allocation."],
      ["sell", "Z-EQ", 500, "Reduce equity toward its target allocation."],
      [
        "buy",
        "A-GOV",
        500,
        "Increase government bond toward its target allocation."
      ],
      [
        "buy",
        "A-CASH",
        500,
        "Increase cash to satisfy the minimum cash allocation."
      ]
    ])
    expect(proposals[0]?.deferred).toEqual([
      {
        assetClass: "corporate_bond",
        amountEUR: 500,
        reason: "No existing position is available for this asset class."
      },
      {
        assetClass: "commodity",
        amountEUR: 500,
        reason: "No existing position is available for this asset class."
      }
    ])
    expect(
      proposals[0]?.violations.map((violation) =>
        violation.constraint === "maxSinglePositionPct"
          ? [violation.constraint, violation.position.isin]
          : [violation.constraint, violation.assetClass]
      )
    ).toEqual([
      ["maxSinglePositionPct", "A-EQ"],
      ["maxSinglePositionPct", "Z-EQ"],
      ["minCashPct", "cash"]
    ])
  })
})
