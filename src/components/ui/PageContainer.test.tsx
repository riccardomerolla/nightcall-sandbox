// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { PageContainer } from "./PageContainer"

describe("PageContainer", () => {
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

  it("renders a neutral wide container by default", () => {
    act(() => root.render(<PageContainer>Content</PageContainer>))

    const container = host.firstElementChild

    expect(container).toBeInstanceOf(HTMLDivElement)
    expect(container?.textContent).toBe("Content")
    expect(container?.className).toContain("container")
    expect(container?.className).toContain("wide")
  })

  it.each(["narrow", "default", "wide"] as const)(
    "supports the %s shared content width",
    (width) => {
      act(() => root.render(<PageContainer width={width} />))

      expect(host.firstElementChild?.className).toContain(width)
    }
  )

  it("supports page semantics and native element attributes", () => {
    act(() =>
      root.render(
        <PageContainer
          as="main"
          width="default"
          className="landing-page"
          aria-label="Workbench"
        >
          Content
        </PageContainer>
      )
    )

    const container = host.firstElementChild

    expect(container).toBeInstanceOf(HTMLElement)
    expect(container?.tagName).toBe("MAIN")
    expect(container?.className).toContain("landing-page")
    expect(container?.getAttribute("aria-label")).toBe("Workbench")
  })
})
