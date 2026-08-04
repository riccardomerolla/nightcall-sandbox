// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>()

  return {
    ...actual,
    useRouter: () => ({
      back: () => {},
      forward: () => {},
      prefetch: () => {},
      push: () => {},
      refresh: () => {},
      replace: () => {}
    })
  }
})

import Home from "../app/page"

describe("Home", () => {
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

  it("presents the advisor workflow and links to the primary routes", () => {
    act(() => root.render(createElement(Home)))

    expect(container.querySelector("main h1")?.textContent).toBe(
      "Advisor Workbench"
    )
    expect(
      Array.from(container.querySelectorAll("article h3"), (heading) =>
        heading.textContent
      )
    ).toEqual([
      "Understand the client",
      "See the whole portfolio",
      "Prepare the next move"
    ])
    expect(
      Array.from(container.querySelectorAll("header a"), (link) => [
        link.textContent,
        link.getAttribute("href")
      ])
    ).toEqual([
      ["Open customer dashboard", "/customer"],
      ["Review proposal", "/customer/proposal"]
    ])
  })
})
