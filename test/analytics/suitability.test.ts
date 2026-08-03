import { readFileSync } from "node:fs"

import { Effect } from "effect"
import { describe, expect, it } from "vitest"

import { suitabilityReport } from "../../lib/analytics/suitability"
import {
  MiFIDConstraints,
  MiFIDProfile,
  type RiskProfile
} from "../../lib/domain/mifid"
import {
  Portfolio,
  PortfolioPosition,
  type AssetClass
} from "../../lib/domain/portfolio"
import { importMiFIDJson } from "../../lib/importers/mifid-json"
import { importPortfolioCsv } from "../../lib/importers/portfolio-csv"

const position = (
  assetClass: AssetClass,
  value: number,
  isin: string = assetClass
): PortfolioPosition =>
  new PortfolioPosition({
    isin,
    name: isin,
    assetClass,
    quantity: 1,
    priceEur: value,
    currency: "EUR"
  })

const portfolioWithAllocation = (
  allocation: Readonly<Record<AssetClass, number>>
): Portfolio =>
  new Portfolio({
    positions: [
      position("equity", allocation.equity),
      position("government_bond", allocation.government_bond),
      position("corporate_bond", allocation.corporate_bond),
      position("commodity", allocation.commodity),
      position("cash", allocation.cash)
    ]
  })

const profile = (
  riskProfile: RiskProfile,
  constraints: {
    readonly maxSinglePositionPct: number
    readonly minCashPct: number
  } = { maxSinglePositionPct: 100, minCashPct: 0 }
): MiFIDProfile =>
  new MiFIDProfile({
    customerId: "CUSTOMER-1",
    fullName: "Test Customer",
    assessedAt: "2026-08-03",
    riskProfile,
    riskProfileScale: [
      "conservative",
      "cautious",
      "balanced",
      "growth",
      "aggressive"
    ],
    investmentHorizonYears: 10,
    knowledgeLevel: "informed",
    sustainabilityPreference: false,
    objectives: ["capital_growth"],
    constraints: new MiFIDConstraints(constraints)
  })

describe("suitabilityReport", () => {
  it("reports allocation deviations against the target for the selected risk profile", () => {
    const report = suitabilityReport(
      portfolioWithAllocation({
        equity: 50,
        government_bond: 20,
        corporate_bond: 10,
        commodity: 10,
        cash: 10
      }),
      profile("growth")
    )

    expect(report.deviations).toEqual([
      { assetClass: "equity", actualPct: 50, targetPct: 65, deviationPct: -15 },
      {
        assetClass: "government_bond",
        actualPct: 20,
        targetPct: 12,
        deviationPct: 8
      },
      {
        assetClass: "corporate_bond",
        actualPct: 10,
        targetPct: 10,
        deviationPct: 0
      },
      { assetClass: "commodity", actualPct: 10, targetPct: 8, deviationPct: 2 },
      { assetClass: "cash", actualPct: 10, targetPct: 5, deviationPct: 5 }
    ])
  })

  it.each(
    [
      ["conservative", [10, 50, 25, 5, 10]],
      ["cautious", [25, 40, 20, 5, 10]],
      ["aggressive", [80, 5, 5, 5, 5]]
    ] satisfies ReadonlyArray<readonly [RiskProfile, ReadonlyArray<number>]>
  )(
    "selects the %s model target",
    (riskProfile, expectedTargetPercentages) => {
      const report = suitabilityReport(
        portfolioWithAllocation({
          equity: 20,
          government_bond: 20,
          corporate_bond: 20,
          commodity: 20,
          cash: 20
        }),
        profile(riskProfile)
      )

      expect(report.deviations.map(({ targetPct }) => targetPct)).toEqual(
        expectedTargetPercentages
      )
    }
  )

  it("reports zero deviations and no violations for a matching portfolio", () => {
    const report = suitabilityReport(
      portfolioWithAllocation({
        equity: 45,
        government_bond: 25,
        corporate_bond: 15,
        commodity: 7,
        cash: 8
      }),
      profile("balanced")
    )

    expect(report.deviations.map(({ assetClass }) => assetClass)).toEqual([
      "equity",
      "government_bond",
      "corporate_bond",
      "commodity",
      "cash"
    ])
    expect(report.deviations.map(({ targetPct }) => targetPct)).toEqual([
      45, 25, 15, 7, 8
    ])
    expect(report.deviations.map(({ actualPct }) => actualPct)).toEqual(
      expect.arrayContaining([
        expect.closeTo(45),
        expect.closeTo(25),
        expect.closeTo(15),
        expect.closeTo(7),
        expect.closeTo(8)
      ])
    )
    expect(report.deviations.every(({ deviationPct }) => deviationPct === 0))
      .toBe(true)
    expect(report.violations).toEqual([])
  })

  it("normalizes tiny floating-point residuals for a proportionally matching portfolio", () => {
    const report = suitabilityReport(
      portfolioWithAllocation({
        equity: 0.45,
        government_bond: 0.25,
        corporate_bond: 0.15,
        commodity: 0.07,
        cash: 0.08
      }),
      profile("balanced")
    )

    expect(report.deviations.map(({ deviationPct }) => deviationPct)).toEqual([
      0, 0, 0, 0, 0
    ])
  })

  it("aggregates positions by asset class while applying the maximum per position", () => {
    const oversizedEquity = position("equity", 30, "EQUITY-30")
    const report = suitabilityReport(
      new Portfolio({
        positions: [
          oversizedEquity,
          position("equity", 15, "EQUITY-15"),
          position("government_bond", 25),
          position("corporate_bond", 15),
          position("commodity", 7),
          position("cash", 8)
        ]
      }),
      profile("balanced", { maxSinglePositionPct: 25, minCashPct: 8 })
    )

    expect(report.deviations[0]).toEqual({
      assetClass: "equity",
      actualPct: 45,
      targetPct: 45,
      deviationPct: 0
    })
    expect(report.violations).toEqual([
      {
        constraint: "maxSinglePositionPct",
        position: oversizedEquity,
        actualPct: 30,
        limitPct: 25
      }
    ])
  })

  it("reports every position exceeding the maximum single-position constraint", () => {
    const equity = position("equity", 45, "EQUITY-1")
    const governmentBond = position("government_bond", 45, "GOVERNMENT-1")
    const cash = position("cash", 10, "CASH-1")
    const report = suitabilityReport(
      new Portfolio({ positions: [equity, governmentBond, cash] }),
      profile("balanced", { maxSinglePositionPct: 40, minCashPct: 0 })
    )

    expect(report.violations).toEqual([
      {
        constraint: "maxSinglePositionPct",
        position: equity,
        actualPct: 45,
        limitPct: 40
      },
      {
        constraint: "maxSinglePositionPct",
        position: governmentBond,
        actualPct: 45,
        limitPct: 40
      }
    ])
  })

  it("reports cash below the minimum cash constraint", () => {
    const report = suitabilityReport(
      portfolioWithAllocation({
        equity: 50,
        government_bond: 20,
        corporate_bond: 10,
        commodity: 10,
        cash: 10
      }),
      profile("balanced", { maxSinglePositionPct: 100, minCashPct: 15 })
    )

    expect(report.violations).toEqual([
      {
        constraint: "minCashPct",
        assetClass: "cash",
        actualPct: 10,
        limitPct: 15
      }
    ])
  })

  it("treats exact maximum-position and minimum-cash boundaries as compliant", () => {
    const report = suitabilityReport(
      new Portfolio({
        positions: [
          position("equity", 25),
          position("government_bond", 25),
          position("corporate_bond", 25),
          position("cash", 25)
        ]
      }),
      profile("balanced", { maxSinglePositionPct: 25, minCashPct: 25 })
    )

    expect(report.violations).toEqual([])
  })

  it("ignores floating-point residuals at both constraint boundaries", () => {
    const report = suitabilityReport(
      portfolioWithAllocation({
        equity: 0.006412000000000001,
        government_bond: 0.00458,
        corporate_bond: 0.00458,
        commodity: 0.005038,
        cash: 0.00229
      }),
      profile("balanced", { maxSinglePositionPct: 28, minCashPct: 10 })
    )

    expect(report.deviations[0]?.actualPct).toBeGreaterThan(28)
    expect(report.deviations[4]?.actualPct).toBeLessThan(10)
    expect(report.violations).toEqual([])
  })

  it("reports position and cash violations together in deterministic order", () => {
    const oversizedEquity = position("equity", 55, "EQUITY-55")
    const report = suitabilityReport(
      new Portfolio({
        positions: [
          oversizedEquity,
          position("government_bond", 43),
          position("cash", 2)
        ]
      }),
      profile("balanced", { maxSinglePositionPct: 50, minCashPct: 5 })
    )

    expect(report.violations).toEqual([
      {
        constraint: "maxSinglePositionPct",
        position: oversizedEquity,
        actualPct: expect.closeTo(55, 12),
        limitPct: 50
      },
      {
        constraint: "minCashPct",
        assetClass: "cash",
        actualPct: 2,
        limitPct: 5
      }
    ])
  })

  it("imports the Mario Rossi fixtures and reports their suitability end to end", async () => {
    const portfolioSource = readFileSync(
      "fixtures/portfolio-mario-rossi.csv",
      "utf8"
    )
    const mifidSource = readFileSync("fixtures/mifid-mario-rossi.json", "utf8")
    const portfolio = await Effect.runPromise(
      importPortfolioCsv(portfolioSource)
    )
    const mifidProfile = await Effect.runPromise(importMiFIDJson(mifidSource))

    expect(portfolio).toBeInstanceOf(Portfolio)
    expect(mifidProfile).toBeInstanceOf(MiFIDProfile)

    const report = suitabilityReport(portfolio, mifidProfile)

    expect(report.deviations).toEqual([
      {
        assetClass: "equity",
        actualPct: expect.closeTo(14.823050920260497, 12),
        targetPct: 45,
        deviationPct: expect.closeTo(-30.176949079739503, 12)
      },
      {
        assetClass: "government_bond",
        actualPct: expect.closeTo(50.6741716313231, 12),
        targetPct: 25,
        deviationPct: expect.closeTo(25.6741716313231, 12)
      },
      {
        assetClass: "corporate_bond",
        actualPct: expect.closeTo(8.741747633631848, 12),
        targetPct: 15,
        deviationPct: expect.closeTo(-6.258252366368152, 12)
      },
      {
        assetClass: "commodity",
        actualPct: expect.closeTo(8.534809269943826, 12),
        targetPct: 7,
        deviationPct: expect.closeTo(1.534809269943826, 12)
      },
      {
        assetClass: "cash",
        actualPct: expect.closeTo(17.226220544840746, 12),
        targetPct: 8,
        deviationPct: expect.closeTo(9.226220544840746, 12)
      }
    ])
    expect(report.violations).toEqual([
      {
        constraint: "maxSinglePositionPct",
        position: portfolio.positions[1],
        actualPct: expect.closeTo(39.69860825561027, 12),
        limitPct: 25
      }
    ])
  })

  it("returns finite deviations for a non-empty zero-value portfolio", () => {
    const report = suitabilityReport(
      new Portfolio({
        positions: [
          position("equity", 0, "EQUITY-0"),
          position("cash", 0, "CASH-0")
        ]
      }),
      profile("balanced")
    )

    expect(report.deviations).toEqual([
      { assetClass: "equity", actualPct: 0, targetPct: 45, deviationPct: -45 },
      {
        assetClass: "government_bond",
        actualPct: 0,
        targetPct: 25,
        deviationPct: -25
      },
      {
        assetClass: "corporate_bond",
        actualPct: 0,
        targetPct: 15,
        deviationPct: -15
      },
      { assetClass: "commodity", actualPct: 0, targetPct: 7, deviationPct: -7 },
      { assetClass: "cash", actualPct: 0, targetPct: 8, deviationPct: -8 }
    ])
    expect(
      report.deviations.every(({ actualPct, deviationPct }) =>
        Number.isFinite(actualPct) && Number.isFinite(deviationPct)
      )
    ).toBe(true)
    expect(report.violations).toEqual([])
  })
})
