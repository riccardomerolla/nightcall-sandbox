// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { PortfolioPosition } from "../lib/domain/portfolio"
import { PortfolioAllocationChart } from "../src/components/PortfolioAllocationChart"

const position = (
  isin: string,
  name: string,
  priceEur: number
): PortfolioPosition =>
  new PortfolioPosition({
    isin,
    name,
    assetClass: "equity",
    quantity: 1,
    priceEur,
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

  it("presents a populated allocation as accessible text and a labelled graphic", () => {
    act(() =>
      root.render(
        createElement(PortfolioAllocationChart, {
          holdings: [
            position("EQUITY", "Core Equity Fund", 300),
            position("CASH", "Cash account", 100)
          ]
        })
      )
    )

    const figure = container.querySelector("figure")
    const heading = container.querySelector("h2")
    const summary = container.querySelector("figcaption")
    const graphic = container.querySelector('svg[role="img"]')

    expect(heading?.textContent).toBe("Portfolio allocation")
    expect(summary?.textContent).toBe(
      "Portfolio allocation. Core Equity Fund: 75.0%; Cash account: 25.0%. Percentages are rounded to one decimal place."
    )
    expect(figure?.getAttribute("aria-labelledby")).toBe(heading?.id)
    expect(figure?.getAttribute("aria-describedby")).toBe(summary?.id)
    expect(graphic?.getAttribute("aria-labelledby")).toBe(heading?.id)
    expect(graphic?.getAttribute("aria-describedby")).toBe(summary?.id)

    const legendItems = Array.from(container.querySelectorAll("ul > li"))
    expect(legendItems.map((item) => item.textContent)).toEqual([
      "Core Equity Fund:75.0%",
      "Cash account:25.0%"
    ])

    const segments = Array.from(graphic?.querySelectorAll("rect") ?? [])
    expect(
      segments.map((segment) => ({
        holdingId: segment.getAttribute("data-holding-id"),
        width: segment.getAttribute("width"),
        label: document.getElementById(
          segment.getAttribute("aria-labelledby") ?? ""
        )?.textContent
      }))
    ).toEqual([
      {
        holdingId: "EQUITY",
        width: "75",
        label: "Core Equity Fund:75.0%"
      },
      {
        holdingId: "CASH",
        width: "25",
        label: "Cash account:25.0%"
      }
    ])
  })

  it("presents an accessible empty state when no holding has positive value", () => {
    act(() =>
      root.render(
        createElement(PortfolioAllocationChart, {
          holdings: [position("EMPTY", "Zero-value holding", 0)]
        })
      )
    )

    const figure = container.querySelector("figure")
    const heading = container.querySelector("h2")
    const summary = container.querySelector("figcaption")

    expect(heading?.textContent).toBe("Portfolio allocation")
    expect(summary?.textContent).toBe(
      "Portfolio allocation is unavailable because this portfolio has no positive-value holdings."
    )
    expect(figure?.getAttribute("aria-labelledby")).toBe(heading?.id)
    expect(figure?.getAttribute("aria-describedby")).toBe(summary?.id)
    expect(container.querySelector("svg")).toBeNull()
    expect(container.querySelector("ul")).toBeNull()
  })
})
