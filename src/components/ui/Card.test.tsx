// @vitest-environment jsdom

import { act, createRef } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Card } from "./Card"

describe("Card", () => {
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

  it("renders a neutral card surface by default", () => {
    act(() => root.render(<Card>Portfolio summary</Card>))

    const card = host.firstElementChild

    expect(card).toBeInstanceOf(HTMLDivElement)
    expect(card?.textContent).toBe("Portfolio summary")
    expect(card?.className).toContain("card")
  })

  it("supports static semantic elements and native attributes", () => {
    act(() =>
      root.render(
        <Card as="article" aria-labelledby="card-title" className="summary">
          <h2 id="card-title">Summary</h2>
        </Card>
      )
    )

    const card = host.firstElementChild

    expect(card?.tagName).toBe("ARTICLE")
    expect(card?.className).toContain("summary")
    expect(card?.getAttribute("aria-labelledby")).toBe("card-title")
  })

  it("preserves native link semantics for an interactive card", () => {
    const ref = createRef<HTMLAnchorElement>()

    act(() =>
      root.render(
        <Card as="a" href="/customer" ref={ref}>
          Open customer
        </Card>
      )
    )

    expect(ref.current).toBe(host.querySelector("a"))
    expect(ref.current?.getAttribute("href")).toBe("/customer")
    expect(ref.current?.textContent).toBe("Open customer")
  })

  it("preserves native button behavior for an interactive card", () => {
    const onClick = vi.fn()
    const ref = createRef<HTMLButtonElement>()

    act(() =>
      root.render(
        <Card as="button" onClick={onClick} ref={ref} type="button">
          Select portfolio
        </Card>
      )
    )

    ref.current?.click()

    expect(ref.current).toBe(host.querySelector("button"))
    expect(ref.current?.type).toBe("button")
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("preserves the native disabled button behavior", () => {
    const onClick = vi.fn()

    act(() =>
      root.render(
        <Card as="button" disabled onClick={onClick}>
          Unavailable
        </Card>
      )
    )

    const card = host.querySelector("button")
    card?.click()

    expect(card?.disabled).toBe(true)
    expect(onClick).not.toHaveBeenCalled()
  })
})
