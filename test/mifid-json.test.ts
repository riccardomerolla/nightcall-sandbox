import { readFileSync } from "node:fs"

import { Effect } from "effect"
import { describe, expect, it } from "vitest"

import { MiFIDProfile } from "../lib/domain/mifid"
import {
  importMiFIDJson,
  MiFIDImportError
} from "../lib/importers/mifid-json"

const fixture = readFileSync("fixtures/mifid-mario-rossi.json", "utf8")

const importFailure = (source: string) =>
  Effect.runPromise(Effect.flip(importMiFIDJson(source)))

const profileSource = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ ...JSON.parse(fixture), ...overrides })

const expectSourceError = async (source: string, path: string) => {
  const error = await importFailure(source)

  expect(error).toBeInstanceOf(MiFIDImportError)
  expect(error._tag).toBe("MiFIDImportError")
  expect(error.reason).toContain(path)
}

const expectProfileError = (overrides: Record<string, unknown>, path: string) =>
  expectSourceError(profileSource(overrides), path)

describe("importMiFIDJson", () => {
  it("imports the Mario Rossi MiFID fixture", async () => {
    const profile = await Effect.runPromise(importMiFIDJson(fixture))

    expect(profile).toBeInstanceOf(MiFIDProfile)
    expect(profile).toMatchObject({
      customerId: "C-000451",
      fullName: "Mario Rossi",
      assessedAt: "2026-03-12",
      riskProfile: "balanced",
      investmentHorizonYears: 8,
      knowledgeLevel: "informed",
      sustainabilityPreference: false,
      objectives: ["capital_growth", "retirement"],
      constraints: {
        maxSinglePositionPct: 25,
        minCashPct: 5
      }
    })
    expect(profile.riskProfileScale).toEqual([
      "conservative",
      "cautious",
      "balanced",
      "growth",
      "aggressive"
    ])
  })

  it("accepts inclusive percentage boundaries", async () => {
    const profile = await Effect.runPromise(importMiFIDJson(profileSource({
      constraints: {
        maxSinglePositionPct: 100,
        minCashPct: 0
      }
    })))

    expect(profile.constraints).toMatchObject({
      maxSinglePositionPct: 100,
      minCashPct: 0
    })
  })

  it("reports malformed JSON as a typed import error", async () => {
    const error = await importFailure('{"customerId":')

    expect(error).toBeInstanceOf(MiFIDImportError)
    expect(error._tag).toBe("MiFIDImportError")
    expect(error.reason).toContain("Invalid JSON")
  })

  it.each([
    ["empty customer ID", { customerId: "" }, "customerId"],
    ["empty full name", { fullName: "" }, "fullName"],
    ["invalid risk profile", { riskProfile: "speculative" }, "riskProfile"],
    ["invalid knowledge level", { knowledgeLevel: "expert" }, "knowledgeLevel"],
    ["zero investment horizon", { investmentHorizonYears: 0 }, "investmentHorizonYears"],
    ["non-integer investment horizon", { investmentHorizonYears: 2.5 }, "investmentHorizonYears"],
    ["empty objectives", { objectives: [] }, "objectives"],
    ["empty objective", { objectives: [""] }, "objectives"],
    [
      "invalid risk profile scale value",
      {
        riskProfileScale: [
          "conservative",
          "cautious",
          "balanced",
          "growth",
          "speculative"
        ]
      },
      "riskProfileScale"
    ],
    [
      "reordered risk profile scale",
      {
        riskProfileScale: [
          "cautious",
          "conservative",
          "balanced",
          "growth",
          "aggressive"
        ]
      },
      "riskProfileScale"
    ],
    [
      "shortened risk profile scale",
      {
        riskProfileScale: [
          "conservative",
          "cautious",
          "balanced",
          "growth"
        ]
      },
      "riskProfileScale"
    ],
    [
      "extended risk profile scale",
      {
        riskProfileScale: [
          "conservative",
          "cautious",
          "balanced",
          "growth",
          "aggressive",
          "aggressive"
        ]
      },
      "riskProfileScale"
    ],
    [
      "maximum position above 100 percent",
      { constraints: { maxSinglePositionPct: 101, minCashPct: 5 } },
      "maxSinglePositionPct"
    ],
    [
      "negative minimum cash percentage",
      { constraints: { maxSinglePositionPct: 25, minCashPct: -1 } },
      "minCashPct"
    ]
  ] satisfies ReadonlyArray<readonly [string, Record<string, unknown>, string]>)(
    "rejects $0",
    async (_case, overrides, path) => {
      await expectProfileError(overrides, path)
    }
  )

  it.each([
    ["customerId", 451],
    ["fullName", 451],
    ["assessedAt", 20260312],
    ["riskProfile", 3],
    ["riskProfileScale", "conservative,cautious,balanced,growth,aggressive"],
    ["investmentHorizonYears", "8"],
    ["knowledgeLevel", 2],
    ["sustainabilityPreference", "false"],
    ["objectives", "capital_growth"],
    ["constraints", "none"],
    ["constraints", { maxSinglePositionPct: "25", minCashPct: 5 }],
    ["constraints", { maxSinglePositionPct: 25, minCashPct: "5" }]
  ] satisfies ReadonlyArray<readonly [string, unknown]>)(
    "rejects an incorrect $0 type",
    async (field, value) => {
      await expectProfileError({ [field]: value }, field)
    }
  )

  it.each(["2026-02-31", "2026-04-31"])(
    "rejects impossible assessment date %s",
    async (assessedAt) => {
      await expectProfileError({ assessedAt }, "assessedAt")
    }
  )

  it.each([
    ["top-level", "customerId"],
    ["nested constraint", "minCashPct"]
  ] as const)("rejects a missing $0 field", async (_case, field) => {
    const profile = JSON.parse(fixture)

    if (field === "minCashPct") {
      delete profile.constraints[field]
    } else {
      delete profile[field]
    }

    await expectSourceError(JSON.stringify(profile), field)
  })
})
