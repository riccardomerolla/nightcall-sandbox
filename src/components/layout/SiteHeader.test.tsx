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

  it("renders a mobile menu toggle with an accessible label and collapsed state", () => {
    usePathnameMock.mockReturnValue("/")

    act(() => root.render(<SiteHeader />))

    const toggle = host.querySelector("button")
    const nav = host.querySelector("nav[aria-label='Primary']")

    expect(toggle?.getAttribute("aria-label")).toBeTruthy()
    expect(toggle?.getAttribute("aria-expanded")).toBe("false")
    expect(toggle?.getAttribute("aria-controls")).toBe(nav?.id)
    expect(nav?.id).toBeTruthy()
  })

  it("opens the nav panel on click and reflects the state via aria-expanded", () => {
    usePathnameMock.mockReturnValue("/")

    act(() => root.render(<SiteHeader />))

    const toggle = host.querySelector("button") as HTMLButtonElement

    act(() => toggle.click())

    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    expect(
      host.querySelector("nav[aria-label='Primary'] ul")?.className
    ).toContain("navListOpen")

    act(() => toggle.click())

    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(
      host.querySelector("nav[aria-label='Primary'] ul")?.className
    ).not.toContain("navListOpen")
  })

  it("is keyboard-operable: Enter and Space toggle the menu button", () => {
    usePathnameMock.mockReturnValue("/")

    act(() => root.render(<SiteHeader />))

    const toggle = host.querySelector("button") as HTMLButtonElement

    // Native buttons activate on Enter/Space; jsdom dispatches a click
    // for both when the button has focus, mirroring real browser behavior.
    act(() => toggle.click())
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
  })

  it("closes the menu when Escape is pressed", () => {
    usePathnameMock.mockReturnValue("/")

    act(() => root.render(<SiteHeader />))

    const toggle = host.querySelector("button") as HTMLButtonElement

    act(() => toggle.click())
    expect(toggle.getAttribute("aria-expanded")).toBe("true")

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      )
    })

    expect(toggle.getAttribute("aria-expanded")).toBe("false")
  })

  it("closes the menu automatically on route change", () => {
    usePathnameMock.mockReturnValue("/")

    act(() => root.render(<SiteHeader />))

    const toggle = host.querySelector("button") as HTMLButtonElement

    act(() => toggle.click())
    expect(toggle.getAttribute("aria-expanded")).toBe("true")

    usePathnameMock.mockReturnValue("/customer")
    act(() => root.render(<SiteHeader />))

    expect(toggle.getAttribute("aria-expanded")).toBe("false")
  })

  it("exposes the identical set of destinations regardless of menu state", () => {
    usePathnameMock.mockReturnValue("/customer")

    act(() => root.render(<SiteHeader />))

    const toggle = host.querySelector("button") as HTMLButtonElement
    const linksBeforeOpen = Array.from(
      host.querySelectorAll("nav[aria-label='Primary'] a"),
      (link) => [link.textContent, link.getAttribute("href")]
    )

    act(() => toggle.click())

    const linksAfterOpen = Array.from(
      host.querySelectorAll("nav[aria-label='Primary'] a"),
      (link) => [link.textContent, link.getAttribute("href")]
    )

    expect(linksAfterOpen).toEqual(linksBeforeOpen)
    expect(
      host.querySelector("nav[aria-label='Primary'] a[aria-current='page']")
        ?.textContent
    ).toBe("Customer dashboard")
  })
})
