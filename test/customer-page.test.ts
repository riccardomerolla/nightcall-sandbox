// @vitest-environment jsdom

import { readFileSync } from "node:fs"

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_PATH = "/nightcall"
})

import CustomerPage from "../app/customer/page"

const fixture = readFileSync("fixtures/mifid-mario-rossi.json", "utf8")
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

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

  it("loads the base-path-aware fixture and renders the imported customer", async () => {
    let respond: (response: Response) => void = () => undefined
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      () => new Promise((resolve) => {
        respond = resolve
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await act(async () => root.render(createElement(CustomerPage)))

    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Loading customer data…"
    )
    expect(fetchMock).toHaveBeenCalledWith(
      "/nightcall/fixtures/mifid-mario-rossi.json",
      { signal: expect.any(AbortSignal) }
    )

    await act(async () => {
      respond(new Response(fixture, { status: 200 }))
      await flushPromises()
    })
    expect(container.textContent).toContain(
      "Customer data loaded for C-000451."
    )
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

  it("renders the importer diagnostic when the fixture is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response('{"customerId":', { status: 200 })
      )
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
    const invalidFixture = JSON.parse(fixture) as Record<string, unknown>
    delete invalidFixture.customerId
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(invalidFixture), { status: 200 })
      )
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
      respond(new Response(fixture, { status: 200 }))
      await flushPromises()
    })
    expect(container.textContent).toBe("")
  })
})
