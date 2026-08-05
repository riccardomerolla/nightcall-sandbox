// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { AssetClassAllocationPercentages } from "../../lib/rebalance/types"
import { PortfolioReallocationChart } from "./PortfolioReallocationChart"

const allocation = (
  values: Partial<AssetClassAllocationPercentages>
): AssetClassAllocationPercentages => ({
  equity: 0,
  government_bond: 0,
  corporate_bond: 0,
  commodity: 0,
  cash: 0,
  ...values
})

describe("PortfolioReallocationChart", () => {
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
    props: Parameters<typeof PortfolioReallocationChart>[0]
  ) => act(() => root.render(<PortfolioReallocationChart {...props} />))

  it("renders a row per asset class with before and after bars", () => {
    renderChart({
      beforeAllocation: allocation({ equity: 60, government_bond: 40 }),
      afterAllocation: allocation({ equity: 50, government_bond: 50 })
    })

    const rows = Array.from(
      container.querySelectorAll(".portfolio-reallocation-chart__row")
    )
    expect(rows).toHaveLength(2)

    const equityRow = container.querySelector('[data-asset-class="equity"]')
    expect(equityRow?.textContent).toContain("Equity")

    const [beforeBar, afterBar] = Array.from(
      equityRow?.querySelectorAll(
        ".portfolio-reallocation-chart__bar"
      ) ?? []
    )
    expect(beforeBar?.getAttribute("style")).toContain("width: 60%")
    expect(afterBar?.getAttribute("style")).toContain("width: 50%")
  })

  it("displays rounded before and after percentages for each asset class", () => {
    renderChart({
      beforeAllocation: allocation({ equity: 33.333, cash: 66.667 }),
      afterAllocation: allocation({ equity: 50, cash: 50 })
    })

    const values = Array.from(
      container.querySelectorAll(".portfolio-reallocation-chart__values"),
      (element) => element.textContent ?? ""
    )

    expect(values).toContain("33.3% → 50.0%")
    expect(values).toContain("66.7% → 50.0%")
  })

  it("omits asset classes with no before or after allocation", () => {
    renderChart({
      beforeAllocation: allocation({ equity: 100 }),
      afterAllocation: allocation({ equity: 100 })
    })

    const rows = container.querySelectorAll(
      ".portfolio-reallocation-chart__row"
    )
    expect(rows).toHaveLength(1)
    expect(container.textContent).not.toContain("Government bond")
  })

  it("keeps an asset class that gains allocation even with a zero before value", () => {
    renderChart({
      beforeAllocation: allocation({ equity: 100 }),
      afterAllocation: allocation({ equity: 80, cash: 20 })
    })

    const cashRow = container.querySelector('[data-asset-class="cash"]')
    expect(cashRow).not.toBeNull()
    expect(cashRow?.textContent).toContain("0.0% → 20.0%")
  })

  it("exposes a text summary describing the reallocation", () => {
    renderChart({
      beforeAllocation: allocation({ equity: 100 }),
      afterAllocation: allocation({ equity: 80, cash: 20 })
    })

    const figure = container.querySelector("figure")
    const summaryId = figure?.getAttribute("aria-describedby")
    const summary =
      summaryId === null ? null : document.getElementById(summaryId ?? "")

    expect(summary?.textContent).toBe(
      "Portfolio reallocation. Equity: 100.0% before, 80.0% after; Cash: 0.0% before, 20.0% after. Percentages are rounded to one decimal place."
    )
  })

  it("renders an informative empty state when there is no positive allocation", () => {
    renderChart({
      beforeAllocation: allocation({}),
      afterAllocation: allocation({})
    })

    expect(
      container.querySelector(".portfolio-reallocation-chart__rows")
    ).toBeNull()
    expect(container.textContent).toContain(
      "Portfolio reallocation is unavailable because this proposal has no positive-value allocations."
    )
  })
})
