import { describe, expect, it } from "vitest"

import { formatEUR } from "../../lib/format/currency"

describe("formatEUR", () => {
  it("formats zero with fixed decimals", () => {
    expect(formatEUR(0)).toBe("€0.00")
  })

  it("formats negative values", () => {
    expect(formatEUR(-1234.5)).toBe("-€1,234.50")
  })

  it("formats large values with thousands separators", () => {
    expect(formatEUR(1234567890.12)).toBe("€1,234,567,890.12")
  })

  it("rounds values to two decimal places", () => {
    expect(formatEUR(1234.567)).toBe("€1,234.57")
  })
})
