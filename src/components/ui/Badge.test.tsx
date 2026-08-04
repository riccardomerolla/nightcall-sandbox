// @vitest-environment jsdom

import { act, createRef } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { Badge, type BadgeVariant } from "./Badge"

describe("Badge", () => {
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

  it("renders a neutral badge by default", () => {
    act(() => root.render(<Badge>Pending review</Badge>))

    const badge = host.querySelector("span")

    expect(badge).toBeInstanceOf(HTMLSpanElement)
    expect(badge?.textContent).toBe("Pending review")
    expect(badge?.className).toContain("badge")
    expect(badge?.className).toContain("neutral")
  })

  it.each<BadgeVariant>([
    "neutral",
    "success",
    "warning",
    "danger",
    "info"
  ])("represents the %s variant", (variant) => {
    act(() => root.render(<Badge variant={variant}>Status</Badge>))

    expect(host.firstElementChild?.className).toContain(variant)
  })

  it("forwards native attributes, classes, and refs", () => {
    const ref = createRef<HTMLSpanElement>()

    act(() =>
      root.render(
        <Badge
          aria-label="Portfolio status: approved"
          className="portfolio-status"
          ref={ref}
          title="Approved"
          variant="success"
        >
          Approved
        </Badge>
      )
    )

    expect(ref.current).toBe(host.querySelector("span"))
    expect(ref.current?.className).toContain("portfolio-status")
    expect(ref.current?.getAttribute("aria-label")).toBe(
      "Portfolio status: approved"
    )
    expect(ref.current?.title).toBe("Approved")
  })
})
