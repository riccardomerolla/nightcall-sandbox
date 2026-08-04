// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  AppRouterContext,
  type AppRouterInstance
} from "next/dist/shared/lib/app-router-context.shared-runtime"

import Home from "../app/page"

// `useRouter()` reads from `AppRouterContext` (see
// next/dist/client/components/navigation.js), so rendering with a real
// provider value exercises the actual hook instead of relying on
// `vi.mock("next/navigation", ...)` hoisting, which this project's vitest
// setup does not apply reliably before the mocked module is imported.
const stubRouter: AppRouterInstance = {
  back: () => {},
  forward: () => {},
  prefetch: () => {},
  push: () => {},
  refresh: () => {},
  replace: () => {}
}

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
    act(() =>
      root.render(
        createElement(
          AppRouterContext.Provider,
          { value: stubRouter },
          createElement(Home)
        )
      )
    )

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
