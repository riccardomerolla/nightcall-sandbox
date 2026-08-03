import { describe, expect, it } from "vitest"

import { formatPercent } from "../../lib/format/percent"

describe("formatPercent", () => {
  it("uses one decimal place by default", () => {
    expect(formatPercent(12.34)).toBe("12.3%")
  })

  it("treats the input as percentage points", () => {
    expect(formatPercent(0.123)).toBe("0.1%")
  })

  it("formats zero with fixed decimals", () => {
    expect(formatPercent(0)).toBe("0.0%")
  })

  it("formats negative values", () => {
    expect(formatPercent(-12.34)).toBe("-12.3%")
  })

  it("formats large values with thousands separators", () => {
    expect(formatPercent(1234567.89)).toBe("1,234,567.9%")
  })

  it("supports custom precision", () => {
    expect(formatPercent(12.3456, 3)).toBe("12.346%")
    expect(formatPercent(12.3456, 0)).toBe("12%")
  })

  it.each([
    [1.24, "1.2%"],
    [1.25, "1.3%"],
    [-1.25, "-1.3%"]
  ])("rounds %s to one decimal place", (value, expected) => {
    expect(formatPercent(value)).toBe(expected)
  })

  it("rounds half-step values at custom precision", () => {
    expect(formatPercent(1.005, 2)).toBe("1.01%")
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5, 21])(
    "rejects invalid precision %s",
    (decimals) => {
      const formatWithInvalidPrecision = () => formatPercent(12.34, decimals)

      expect(formatWithInvalidPrecision).toThrow(RangeError)
      expect(formatWithInvalidPrecision).toThrow(
        "decimals must be an integer from 0 to 20"
      )
    }
  )

  it("supports the maximum precision", () => {
    expect(formatPercent(1, 20)).toBe("1.00000000000000000000%")
  })

  it.each([
    [Number.NaN, "NaN%"],
    [Number.POSITIVE_INFINITY, "∞%"],
    [Number.NEGATIVE_INFINITY, "-∞%"]
  ])("formats special numeric value %s", (value, expected) => {
    expect(formatPercent(value)).toBe(expected)
  })

  it("preserves negative zero", () => {
    expect(formatPercent(-0)).toBe("-0.0%")
  })
})
