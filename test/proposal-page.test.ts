// @vitest-environment jsdom

import { readFileSync } from "node:fs"

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_PATH = "/nightcall"
})

import ProposalPage from "../app/customer/proposal/page"

const customerFixture = readFileSync("fixtures/mifid-mario-rossi.json", "utf8")
const portfolioFixture = readFileSync(
  "fixtures/portfolio-mario-rossi.csv",
  "utf8"
)
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const customerFixtureUrl = "/nightcall/fixtures/mifid-mario-rossi.json"
const portfolioFixtureUrl = "/nightcall/fixtures/portfolio-mario-rossi.csv"

type FixtureResponse = () => Response | Promise<Response>

const createFixtureFetchMock = ({
  customer = () => new Response(customerFixture, { status: 200 }),
  portfolio = () => new Response(portfolioFixture, { status: 200 })
}: {
  readonly customer?: FixtureResponse
  readonly portfolio?: FixtureResponse
} = {}) =>
  vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = String(input)

    if (url === customerFixtureUrl) {
      return Promise.resolve(customer())
    }

    if (url === portfolioFixtureUrl) {
      return Promise.resolve(portfolio())
    }

    return Promise.reject(new Error(`Unexpected fixture request: ${url}`))
  })

const tableRows = (section: Element | null) =>
  Array.from(section?.querySelectorAll("tbody tr") ?? [], (row) =>
    Array.from(row.children, (cell) => cell.textContent)
  )

describe("ProposalPage", () => {
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
    vi.unstubAllGlobals()
  })

  it("loads fixtures and renders the complete proposal", async () => {
    let respond: (response: Response) => void = () => undefined
    const fetchMock = createFixtureFetchMock({
      customer: () =>
        new Promise((resolve) => {
          respond = resolve
        })
    })
    vi.stubGlobal("fetch", fetchMock)

    await act(async () => root.render(createElement(ProposalPage)))

    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Loading customer data…"
    )
    expect(container.querySelector("a")?.textContent).toBe(
      "Back to customer dashboard"
    )
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/customer"
    )

    await act(async () => {
      respond(new Response(customerFixture, { status: 200 }))
      await flushPromises()
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, customerFixtureUrl, {
      signal: expect.any(AbortSignal)
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, portfolioFixtureUrl, {
      signal: expect.any(AbortSignal)
    })
    expect(container.querySelector("h1")?.textContent).toBe(
      "Rebalancing proposal"
    )
    expect(container.textContent).toContain("Prepared for Mario Rossi.")
    expect(container.querySelector("a")?.textContent).toBe(
      "Back to customer dashboard"
    )
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/customer")

    const allocation = container.querySelector(
      'section[aria-labelledby="allocation-heading"]'
    )
    expect(tableRows(allocation)).toEqual([
      ["Equity", "14.8%", "45.0%"],
      ["Government bond", "50.7%", "25.0%"],
      ["Corporate bond", "8.7%", "15.0%"],
      ["Commodity", "8.5%", "7.0%"],
      ["Cash", "17.2%", "8.0%"]
    ])

    const reallocationChart = allocation?.querySelector(
      ".portfolio-reallocation-chart"
    )
    expect(reallocationChart).not.toBeNull()
    expect(
      Array.from(
        reallocationChart?.querySelectorAll(
          ".portfolio-reallocation-chart__row"
        ) ?? [],
        (row) => row.textContent
      )
    ).toEqual([
      "Equity14.8% → 45.0%",
      "Government bond50.7% → 25.0%",
      "Corporate bond8.7% → 15.0%",
      "Commodity8.5% → 7.0%",
      "Cash17.2% → 8.0%"
    ])

    const summary = container.querySelector(
      'section[aria-labelledby="summary-heading"]'
    )
    expect(summary?.textContent).toContain("Trade count5")
    expect(summary?.textContent).toContain("Total turnover€56,897.01")
    expect(summary?.textContent).toContain("Resulting cash allocation8.0%")

    const trades = container.querySelector(
      'section[aria-labelledby="trades-heading"]'
    )
    expect(tableRows(trades)).toEqual([
      [
        "Sell",
        "iShares Core Euro Government Bond UCITS ETF",
        "€22,952.35",
        "Reduce government bond toward its target allocation."
      ],
      [
        "Sell",
        "Invesco Physical Gold ETC",
        "€1,372.10",
        "Reduce commodity toward its target allocation."
      ],
      [
        "Buy",
        "Amundi MSCI Emerging Markets",
        "€21,280.45",
        "Increase equity toward its target allocation."
      ],
      [
        "Buy",
        "iShares Core MSCI World UCITS ETF",
        "€5,697.32",
        "Increase equity toward its target allocation."
      ],
      [
        "Buy",
        "Amundi ETF Euro Corporate Bond",
        "€5,594.79",
        "Increase corporate bond toward its target allocation."
      ]
    ])

    const deferred = container.querySelector(
      'section[aria-labelledby="deferred-heading"]'
    )
    expect(deferred?.textContent).toContain("No adjustments are deferred.")
    expect(deferred?.querySelector("table")).toBeNull()
  })

  it("renders clear empty states when the portfolio already matches its target", async () => {
    const targetPortfolio = [
      "isin,name,assetClass,quantity,priceEur,currency",
      "EQ,Equity fund,equity,1,4500,EUR",
      "GOV,Government bond fund,government_bond,1,2500,EUR",
      "CORP,Corporate bond fund,corporate_bond,1,1500,EUR",
      "COM,Commodity fund,commodity,1,700,EUR",
      "CASH,Cash account,cash,1,800,EUR"
    ].join("\n")
    const unconstrainedCustomer = JSON.parse(customerFixture) as Record<
      string,
      unknown
    >
    unconstrainedCustomer.constraints = {
      maxSinglePositionPct: 100,
      minCashPct: 5
    }
    vi.stubGlobal(
      "fetch",
      createFixtureFetchMock({
        customer: () =>
          new Response(JSON.stringify(unconstrainedCustomer), { status: 200 }),
        portfolio: () => new Response(targetPortfolio, { status: 200 })
      })
    )

    await act(async () => {
      root.render(createElement(ProposalPage))
      await flushPromises()
    })

    expect(container.textContent).toContain("No trades are proposed.")
    expect(container.textContent).toContain("No adjustments are deferred.")
    expect(container.textContent).toContain("Total turnover€0.00")
  })

  it("renders deferred adjustments with amount and reason", async () => {
    const constrainedCustomer = JSON.parse(customerFixture) as Record<
      string,
      unknown
    >
    constrainedCustomer.constraints = {
      maxSinglePositionPct: 15,
      minCashPct: 5
    }
    vi.stubGlobal(
      "fetch",
      createFixtureFetchMock({
        customer: () =>
          new Response(JSON.stringify(constrainedCustomer), { status: 200 })
      })
    )

    await act(async () => {
      root.render(createElement(ProposalPage))
      await flushPromises()
    })

    const deferred = container.querySelector(
      'section[aria-labelledby="deferred-heading"]'
    )
    expect(tableRows(deferred)).toEqual([
      [
        "Amundi MSCI Emerging Markets",
        "€13,409.79",
        "The single-position limit prevents this adjustment."
      ]
    ])
  })

  it("renders dashboard-consistent customer parse errors", async () => {
    vi.stubGlobal(
      "fetch",
      createFixtureFetchMock({
        customer: () => new Response('{"customerId":', { status: 200 })
      })
    )

    await act(async () => {
      root.render(createElement(ProposalPage))
      await flushPromises()
    })

    expect(container.querySelector("h1")?.textContent).toBe(
      "Unable to load customer"
    )
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "The customer data is invalid: Invalid JSON:"
    )
    expect(container.querySelector("a")?.textContent).toBe(
      "Back to customer dashboard"
    )
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/customer"
    )
  })

  it("renders dashboard-consistent portfolio parse errors", async () => {
    vi.stubGlobal(
      "fetch",
      createFixtureFetchMock({
        portfolio: () => new Response("not,a,portfolio", { status: 200 })
      })
    )

    await act(async () => {
      root.render(createElement(ProposalPage))
      await flushPromises()
    })

    expect(container.querySelector("h1")?.textContent).toBe(
      "Unable to load portfolio"
    )
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "The portfolio data is invalid: Expected header"
    )
    expect(container.querySelector("a")?.textContent).toBe(
      "Back to customer dashboard"
    )
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/customer"
    )
  })
})
