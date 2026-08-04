// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { SiteFooter } from "./SiteFooter"

describe("SiteFooter", () => {
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
  })

  it("renders a footer landmark", () => {
    act(() => root.render(<SiteFooter />))

    expect(host.querySelector("footer")).not.toBeNull()
  })

  it("renders the app wordmark", () => {
    act(() => root.render(<SiteFooter />))

    expect(host.textContent).toContain("Advisor Workbench")
  })

  it("renders a copyright line with the current year", () => {
    act(() => root.render(<SiteFooter />))

    const year = new Date().getFullYear().toString()

    expect(host.textContent).toContain(`© ${year}`)
  })
})
