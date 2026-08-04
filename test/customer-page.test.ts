// @vitest-environment jsdom

import { readFileSync } from "node:fs"

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_PATH = "/nightcall"
})

import CustomerPage from "../app/customer/page"

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

describe("CustomerPage", () => {
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

  it("loads base-path-aware customer and portfolio fixtures and renders the dashboard", async () => {
    let respond: (response: Response) => void = () => undefined
    const fetchMock = createFixtureFetchMock({
      customer: () =>
        new Promise((resolve) => {
          respond = resolve
        })
    })
    vi.stubGlobal("fetch", fetchMock)

    await act(async () => root.render(createElement(CustomerPage)))

    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Loading customer data…"
    )
    expect(fetchMock).toHaveBeenCalledWith(
      customerFixtureUrl,
      { signal: expect.any(AbortSignal) }
    )

    await act(async () => {
      respond(new Response(customerFixture, { status: 200 }))
      await flushPromises()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      portfolioFixtureUrl,
      { signal: expect.any(AbortSignal) }
    )
    expect(container.textContent).toContain(
      "Customer data loaded for C-000451."
    )

    const profileHeader = container.querySelector("header")
    expect(profileHeader).toBeInstanceOf(HTMLElement)
    if (!(profileHeader instanceof HTMLElement)) {
      throw new Error("Expected the loaded customer profile header")
    }

    const customerName = profileHeader.querySelector("h1")
    expect(customerName?.id).toBe("customer-name")
    expect(customerName?.textContent).toBe("Mario Rossi")
    expect(profileHeader.getAttribute("aria-labelledby")).toBe(customerName?.id)

    const profileDetails = profileHeader.querySelector("dl")
    expect(profileDetails).toBeInstanceOf(HTMLDListElement)

    const definitionFor = (term: string) => {
      const definitionTerm = Array.from(
        profileDetails?.querySelectorAll("dt") ?? []
      ).find((element) => element.textContent === term)

      expect(definitionTerm).toBeInstanceOf(HTMLElement)
      expect(definitionTerm?.nextElementSibling).toBeInstanceOf(HTMLElement)
      expect(definitionTerm?.nextElementSibling?.tagName).toBe("DD")

      return definitionTerm?.nextElementSibling?.textContent
    }

    expect(definitionFor("Portfolio value")).toBe("€89,398.60")
    expect(definitionFor("Risk profile")).toBe("Balanced")
    expect(definitionFor("Investment horizon")).toBe("8 years")
    expect(definitionFor("Objectives")).toBe("Capital growth, Retirement")

    const positions = container.querySelector(
      'section[aria-labelledby="positions-heading"]'
    )
    expect(positions).toBeInstanceOf(HTMLElement)
    expect(positions?.querySelector("h2")?.textContent).toBe("Positions")

    const rows = positions?.querySelectorAll("tbody tr") ?? []
    expect(
      Array.from(rows, (row) =>
        Array.from(row.children, (cell) => cell.textContent)
      )
    ).toEqual([
      ["iShares Core MSCI World UCITS ETF", "€12,182.40", "13.6%"],
      [
        "iShares Core Euro Government Bond UCITS ETF",
        "€35,490.00",
        "39.7%"
      ],
      ["Amundi ETF Euro Corporate Bond", "€7,815.00", "8.7%"],
      ["Invesco Physical Gold ETC", "€7,630.00", "8.5%"],
      ["BTP Italia Nov 2028", "€9,812.00", "11.0%"],
      ["Amundi MSCI Emerging Markets", "€1,069.20", "1.2%"],
      ["Cash account", "€15,400.00", "17.2%"]
    ])

    const allocation = container.querySelector(
      'section[aria-labelledby="allocation-heading"]'
    )
    expect(allocation).toBeInstanceOf(HTMLElement)
    expect(allocation?.querySelector("h2")?.textContent).toBe(
      "Allocation comparison"
    )

    const allocationHeadings = Array.from(
      allocation?.querySelectorAll("thead th") ?? [],
      (heading) => heading.textContent
    )
    expect(allocationHeadings).toEqual([
      "Asset class",
      "Current",
      "Target",
      "Deviation"
    ])

    const allocationRows = allocation?.querySelectorAll("tbody tr") ?? []
    expect(
      Array.from(allocationRows, (row) =>
        Array.from(row.children, (cell) => cell.textContent)
      )
    ).toEqual([
      ["Equity", "14.8%", "45.0%", "-30.2%"],
      ["Government bond", "50.7%", "25.0%", "25.7%"],
      ["Corporate bond", "8.7%", "15.0%", "-6.3%"],
      ["Commodity", "8.5%", "7.0%", "1.5%"],
      ["Cash", "17.2%", "8.0%", "9.2%"]
    ])

    const suitability = container.querySelector(
      'section[aria-labelledby="suitability-heading"]'
    )
    expect(suitability).toBeInstanceOf(HTMLElement)
    expect(suitability?.querySelector("h2")?.textContent).toBe(
      "Suitability violations"
    )
    expect(
      Array.from(
        suitability?.querySelectorAll("li") ?? [],
        (violation) => violation.textContent
      )
    ).toEqual([
      "iShares Core Euro Government Bond UCITS ETF is 39.7% of the portfolio, above the 25.0% maximum."
    ])
    expect(profileHeader.querySelector("a")?.textContent).toBe(
      "View rebalancing proposal"
    )
    expect(profileHeader.querySelector("a")?.getAttribute("href")).toBe(
      "/customer/proposal"
    )
  })

  it("renders the suitability empty state when the portfolio has no violations", async () => {
    const unconstrainedFixture = JSON.parse(customerFixture) as Record<
      string,
      unknown
    >
    unconstrainedFixture.constraints = {
      maxSinglePositionPct: 100,
      minCashPct: 0
    }
    vi.stubGlobal(
      "fetch",
      createFixtureFetchMock({
        customer: () =>
          new Response(JSON.stringify(unconstrainedFixture), { status: 200 })
      })
    )

    await act(async () => {
      root.render(createElement(CustomerPage))
      await flushPromises()
    })

    const suitability = container.querySelector(
      'section[aria-labelledby="suitability-heading"]'
    )
    expect(suitability?.textContent).toContain(
      "No suitability violations detected."
    )
    expect(suitability?.querySelector("li")).toBeNull()
    expect(container.querySelector("header a")?.getAttribute("href")).toBe(
      "/customer/proposal"
    )
  })

  it("renders position and minimum-cash violations in report order", async () => {
    const lowCashFixture = JSON.parse(customerFixture) as Record<
      string,
      unknown
    >
    lowCashFixture.constraints = {
      maxSinglePositionPct: 25,
      minCashPct: 20
    }
    vi.stubGlobal(
      "fetch",
      createFixtureFetchMock({
        customer: () =>
          new Response(JSON.stringify(lowCashFixture), { status: 200 })
      })
    )

    await act(async () => {
      root.render(createElement(CustomerPage))
      await flushPromises()
    })

    const suitability = container.querySelector(
      'section[aria-labelledby="suitability-heading"]'
    )
    expect(
      Array.from(
        suitability?.querySelectorAll("li") ?? [],
        (violation) => violation.textContent
      )
    ).toEqual([
      "iShares Core Euro Government Bond UCITS ETF is 39.7% of the portfolio, above the 25.0% maximum.",
      "Cash is 17.2% of the portfolio, below the 20.0% minimum."
    ])
  })

  it("renders the response status when the fixture request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }))
    )

    await act(async () => {
      root.render(createElement(CustomerPage))
      await flushPromises()
    })
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "The customer data could not be loaded: Customer request failed (503)"
    )
  })

  it("renders the response status when the portfolio request fails", async () => {
    vi.stubGlobal(
      "fetch",
      createFixtureFetchMock({
        portfolio: () => new Response(null, { status: 502 })
      })
    )

    await act(async () => {
      root.render(createElement(CustomerPage))
      await flushPromises()
    })

    expect(container.querySelector("h1")?.textContent).toBe(
      "Unable to load portfolio"
    )
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "The portfolio data could not be loaded: Portfolio request failed (502)"
    )
  })

  it("uses singular grammar for a one-year investment horizon", async () => {
    const oneYearFixture = JSON.parse(customerFixture) as Record<string, unknown>
    oneYearFixture.investmentHorizonYears = 1
    vi.stubGlobal(
      "fetch",
      createFixtureFetchMock({
        customer: () =>
          new Response(JSON.stringify(oneYearFixture), { status: 200 })
      })
    )

    await act(async () => {
      root.render(createElement(CustomerPage))
      await flushPromises()
    })

    const investmentHorizonTerm = Array.from(
      container.querySelectorAll("dt")
    ).find((element) => element.textContent === "Investment horizon")

    expect(investmentHorizonTerm?.nextElementSibling?.textContent).toBe("1 year")
  })

  it("renders the importer diagnostic when the fixture is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      createFixtureFetchMock({
        customer: () => new Response('{"customerId":', { status: 200 })
      })
    )

    await act(async () => {
      root.render(createElement(CustomerPage))
      await flushPromises()
    })
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "The customer data is invalid: Invalid JSON:"
    )
    expect(container.textContent).not.toContain("[object Object]")
  })

  it("renders the importer diagnostic when required customer data is missing", async () => {
    const invalidFixture = JSON.parse(customerFixture) as Record<string, unknown>
    delete invalidFixture.customerId
    vi.stubGlobal(
      "fetch",
      createFixtureFetchMock({
        customer: () =>
          new Response(JSON.stringify(invalidFixture), { status: 200 })
      })
    )

    await act(async () => {
      root.render(createElement(CustomerPage))
      await flushPromises()
    })

    const alert = container.querySelector('[role="alert"]')?.textContent
    expect(alert).toContain("The customer data is invalid: Invalid MiFID profile:")
    expect(alert).toContain("customerId")
    expect(container.textContent).not.toContain("Customer data loaded")
  })

  it("renders a request error when fetching the fixture rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Network unavailable"))
    )

    await act(async () => {
      root.render(createElement(CustomerPage))
      await flushPromises()
    })

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "The customer data could not be loaded: Network unavailable"
    )
  })

  it("renders a request error when reading the response body fails", async () => {
    const response = {
      ok: true,
      status: 200,
      text: vi.fn().mockRejectedValue(new Error("Body read failed"))
    } as unknown as Response
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(response))

    await act(async () => {
      root.render(createElement(CustomerPage))
      await flushPromises()
    })

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "The customer data could not be loaded: Body read failed"
    )
  })

  it("aborts the request on unmount and ignores a late result", async () => {
    let requestSignal: AbortSignal | undefined
    let respond: (response: Response) => void = () => undefined
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation((_input, init) => {
        requestSignal = init?.signal as AbortSignal
        return new Promise((resolve) => {
          respond = resolve
        })
      })
    )

    await act(async () => root.render(createElement(CustomerPage)))
    expect(requestSignal?.aborted).toBe(false)

    await act(async () => root.unmount())
    expect(requestSignal?.aborted).toBe(true)

    await act(async () => {
      respond(new Response(customerFixture, { status: 200 }))
      await flushPromises()
    })
    expect(container.textContent).toBe("")
  })

  it("renders an error when the portfolio fixture is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      createFixtureFetchMock({
        portfolio: () => new Response("not,a,portfolio", { status: 200 })
      })
    )

    await act(async () => {
      root.render(createElement(CustomerPage))
      await flushPromises()
    })

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "The portfolio data is invalid: Expected header"
    )
  })
})
