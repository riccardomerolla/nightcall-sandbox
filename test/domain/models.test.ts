import { describe, expect, it } from "vitest"

import { MODEL_TARGET_ALLOCATION_PERCENTAGES } from "../../lib/domain/models"

describe("MODEL_TARGET_ALLOCATION_PERCENTAGES", () => {
  it("defines the target allocation for every risk profile", () => {
    expect(MODEL_TARGET_ALLOCATION_PERCENTAGES).toEqual({
      conservative: {
        equity: 10,
        government_bond: 50,
        corporate_bond: 25,
        commodity: 5,
        cash: 10
      },
      cautious: {
        equity: 25,
        government_bond: 40,
        corporate_bond: 20,
        commodity: 5,
        cash: 10
      },
      balanced: {
        equity: 45,
        government_bond: 25,
        corporate_bond: 15,
        commodity: 7,
        cash: 8
      },
      growth: {
        equity: 65,
        government_bond: 12,
        corporate_bond: 10,
        commodity: 8,
        cash: 5
      },
      aggressive: {
        equity: 80,
        government_bond: 5,
        corporate_bond: 5,
        commodity: 5,
        cash: 5
      }
    })
  })

  it.each(Object.entries(MODEL_TARGET_ALLOCATION_PERCENTAGES))(
    "%s totals exactly 100 percent",
    (_riskProfile, allocation) => {
      expect(Object.values(allocation).reduce((total, value) => total + value, 0))
        .toBe(100)
    }
  )
})
