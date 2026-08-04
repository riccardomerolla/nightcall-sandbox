// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn<() => string>()
}))

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock
}))

import { SiteHeader } from "./SiteHeader"

describe("SiteHeader", () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    host = document.createElement("div")
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.clearAllMocks()
  })

  it("renders the app wordmark linking home", () => {
    usePathnameMock.mockReturnValue("/customer")

    act(() => root.render(<SiteHeader />))

    const wordmark = host.querySelector("header > div > a")

    expect(wordmark?.textContent).toBe("Advisor Workbench")
    expect(wordmark?.getAttribute("href")).toBe("/")
  })

  it("renders the primary navigation destinations in order", () => {
    usePathnameMock.mockReturnValue("/customer")

    act(() => root.render(<SiteHeader />))

    const links = Array.from(
      host.querySelectorAll("nav[aria-label='Primary'] a"),
      (link) => [link.textContent, link.getAttribute("href")]
    )

    expect(links).toEqual([
      ["Home", "/"],
      ["Customer dashboard", "/customer"],
      ["Proposal", "/customer/proposal"]
    ])
  })

  it.each([
    ["/", "Home"],
    ["/customer", "Customer dashboard"],
    ["/customer/proposal", "Proposal"]
  ] as const)(
    "marks %s as the active destination via aria-current",
    (pathname, activeLabel) => {
      usePathnameMock.mockReturnValue(pathname)

      act(() => root.render(<SiteHeader />))

      const navLinks = host.querySelectorAll("nav[aria-label='Primary'] a")

      navLinks.forEach((link) => {
        if (link.textContent === activeLabel) {
          expect(link.getAttribute("aria-current")).toBe("page")
        } else {
          expect(link.getAttribute("aria-current")).toBeNull()
        }
      })
    }
  )
})
