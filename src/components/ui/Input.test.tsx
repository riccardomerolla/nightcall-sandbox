// @vitest-environment jsdom

import { act, createRef } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Input } from "./Input"

describe("Input", () => {
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

  it("renders a label associated with a native input", () => {
    act(() => root.render(<Input label="Customer name" name="name" />))

    const input = host.querySelector("input")
    const label = host.querySelector("label")

    expect(input).toBeInstanceOf(HTMLInputElement)
    expect(input?.name).toBe("name")
    expect(label?.textContent).toBe("Customer name")
    expect(label?.htmlFor).toBe(input?.id)
    expect(input?.id).not.toBe("")
  })

  it("connects helper and error messages to the input", () => {
    act(() =>
      root.render(
        <Input
          aria-describedby="external-description"
          errorMessage="Use a valid email address"
          helperText="We will use this for notifications"
          id="email"
          label="Email"
          type="email"
        />
      )
    )

    const input = host.querySelector("input")

    expect(input?.getAttribute("aria-describedby")).toBe(
      "external-description email-helper email-error"
    )
    expect(input?.getAttribute("aria-errormessage")).toBe("email-error")
    expect(input?.getAttribute("aria-invalid")).toBe("true")
    expect(host.querySelector("#email-helper")?.textContent).toBe(
      "We will use this for notifications"
    )
    expect(host.querySelector("#email-error")?.textContent).toBe(
      "Use a valid email address"
    )
  })

  it.each(["valid", "invalid"] as const)(
    "represents the %s validation state",
    (validationState) => {
      act(() =>
        root.render(
          <Input label="Amount" validationState={validationState} />
        )
      )

      const field = host.firstElementChild
      const input = host.querySelector("input")

      expect(field?.className).toContain(validationState)
      expect(input?.getAttribute("aria-invalid")).toBe(
        validationState === "invalid" ? "true" : null
      )
    }
  )

  it("forwards native attributes, events, classes, and refs", () => {
    const onChange = vi.fn()
    const ref = createRef<HTMLInputElement>()

    act(() =>
      root.render(
        <Input
          autoComplete="name"
          className="customer-name"
          defaultValue="Mario Rossi"
          label="Customer name"
          onChange={onChange}
          ref={ref}
          required
        />
      )
    )

    expect(ref.current).toBe(host.querySelector("input"))
    expect(ref.current?.className).toContain("customer-name")
    expect(ref.current?.autocomplete).toBe("name")
    expect(ref.current?.required).toBe(true)
    expect(ref.current?.value).toBe("Mario Rossi")
  })

  it("preserves native disabled behavior", () => {
    act(() => root.render(<Input disabled label="Account number" />))

    const field = host.firstElementChild
    const input = host.querySelector("input")

    expect(field?.className).toContain("disabled")
    expect(input?.disabled).toBe(true)
  })
})
