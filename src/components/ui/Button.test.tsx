// @vitest-environment jsdom

import { act, createRef } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Button } from "./Button"

describe("Button", () => {
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

  it("renders a native primary, medium button by default", () => {
    act(() => root.render(<Button>Save proposal</Button>))

    const button = host.querySelector("button")

    expect(button).toBeInstanceOf(HTMLButtonElement)
    expect(button?.textContent).toBe("Save proposal")
    expect(button?.className).toContain("button")
    expect(button?.className).toContain("primary")
    expect(button?.className).toContain("medium")
    expect(button?.hasAttribute("type")).toBe(false)
  })

  it.each(["primary", "secondary", "danger"] as const)(
    "supports the %s visual variant",
    (variant) => {
      act(() => root.render(<Button variant={variant}>Action</Button>))

      expect(host.querySelector("button")?.className).toContain(variant)
    }
  )

  it.each(["small", "medium", "large"] as const)(
    "supports the %s size",
    (size) => {
      act(() => root.render(<Button size={size}>Action</Button>))

      expect(host.querySelector("button")?.className).toContain(size)
    }
  )

  it("forwards native attributes, events, classes, and refs", () => {
    const onClick = vi.fn()
    const ref = createRef<HTMLButtonElement>()

    act(() =>
      root.render(
        <Button
          aria-label="Submit proposal"
          className="proposal-action"
          name="intent"
          onClick={onClick}
          ref={ref}
          type="submit"
          value="save"
        >
          Save
        </Button>
      )
    )

    ref.current?.click()

    expect(ref.current).toBe(host.querySelector("button"))
    expect(ref.current?.className).toContain("proposal-action")
    expect(ref.current?.getAttribute("aria-label")).toBe("Submit proposal")
    expect(ref.current?.name).toBe("intent")
    expect(ref.current?.type).toBe("submit")
    expect(ref.current?.value).toBe("save")
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("preserves the native disabled behavior", () => {
    const onClick = vi.fn()

    act(() =>
      root.render(
        <Button disabled onClick={onClick}>
          Unavailable
        </Button>
      )
    )

    const button = host.querySelector("button")
    button?.click()

    expect(button?.disabled).toBe(true)
    expect(onClick).not.toHaveBeenCalled()
  })
})
