// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { PortfolioPosition } from "../../lib/domain/portfolio"
import { PortfolioAllocationChart } from "./PortfolioAllocationChart"

const holding = (isin: string, name: string, value: number) =>
  new PortfolioPosition({
    isin,
    name,
    assetClass: "equity",
    quantity: 1,
    priceEur: value,
    currency: "EUR"
  })

describe("PortfolioAllocationChart", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const renderChart = (
    holdings: Parameters<typeof PortfolioAllocationChart>[0]["holdings"]
  ) => act(() => root.render(<PortfolioAllocationChart holdings={holdings} />))

  it("renders proportional SVG segments and rounded percentages", () => {
    renderChart([
      holding("FIRST", "First fund", 1),
      holding("SECOND", "Second fund", 2)
    ])

    const segments = Array.from(container.querySelectorAll("svg rect"))
    expect(segments).toHaveLength(2)
    expect(Number(segments[0]?.getAttribute("x"))).toBeCloseTo(0)
    expect(Number(segments[0]?.getAttribute("width"))).toBeCloseTo(100 / 3)
    expect(Number(segments[1]?.getAttribute("x"))).toBeCloseTo(100 / 3)
    expect(Number(segments[1]?.getAttribute("width"))).toBeCloseTo(200 / 3)
    const displayedPercentages = Array.from(
      container.querySelectorAll("li strong"),
      (label) => label.textContent ?? ""
    )
    expect(displayedPercentages).toEqual(["33.3%", "66.7%"])
    expect(
      displayedPercentages.reduce(
        (total, percentage) => total + Number.parseFloat(percentage),
        0
      )
    ).toBeCloseTo(100, 0)
  })

  it("matches every segment to its visible label and colour", () => {
    renderChart([
      holding("FIRST", "First fund", 40),
      holding("SECOND", "Second fund", 60)
    ])

    for (const segment of container.querySelectorAll("svg rect")) {
      const labelId = segment.getAttribute("aria-labelledby")
      const label = labelId === null ? null : document.getElementById(labelId)

      expect(label).toBeInstanceOf(HTMLLIElement)
      expect(label?.dataset.holdingId).toBe(
        segment.getAttribute("data-holding-id")
      )
      expect(label?.getAttribute("style")).toBe(segment.getAttribute("style"))
      expect(
        label?.querySelector(".portfolio-allocation-chart__swatch")
      ).not.toBeNull()
    }
  })

  it("exposes a text summary describing the allocation", () => {
    renderChart([
      holding("FIRST", "First fund", 25),
      holding("SECOND", "Second fund", 75)
    ])

    const figure = container.querySelector("figure")
    const summaryId = figure?.getAttribute("aria-describedby")
    const summary =
      summaryId === null ? null : document.getElementById(summaryId ?? "")

    expect(summary?.textContent).toBe(
      "Portfolio allocation. First fund: 25.0%; Second fund: 75.0%. Percentages are rounded to one decimal place."
    )
    expect(container.querySelector("svg")?.getAttribute("aria-describedby")).toBe(
      summaryId
    )
  })

  it("omits zero-value holdings without changing positive allocations", () => {
    renderChart([
      holding("ZERO", "Zero-value fund", 0),
      holding("POSITIVE", "Positive fund", 50)
    ])

    expect(container.querySelectorAll("svg rect")).toHaveLength(1)
    expect(container.querySelector("svg rect")?.getAttribute("width")).toBe(
      "100"
    )
    expect(container.textContent).not.toContain("Zero-value fund")
    expect(container.textContent).toContain("Positive fund: 100.0%")
  })

  it.each([
    ["zero-value", [holding("ZERO", "Zero-value fund", 0)]],
    ["empty", []]
  ])("renders an informative %s portfolio state", (_description, holdings) => {
    renderChart(holdings)

    expect(container.querySelector("svg")).toBeNull()
    expect(container.querySelector("ul")).toBeNull()
    expect(container.textContent).toContain(
      "Portfolio allocation is unavailable because this portfolio has no positive-value holdings."
    )
  })
})
