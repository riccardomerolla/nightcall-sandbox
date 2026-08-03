"use client"

import { Effect } from "effect"
import { useEffect, useState } from "react"

import type { MiFIDProfile } from "../../lib/domain/mifid"
import { importMiFIDJson } from "../../lib/importers/mifid-json"

const customerFixtureUrl = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/fixtures/mifid-mario-rossi.json`

type CustomerState =
  | { readonly status: "loading" }
  | { readonly status: "loaded"; readonly customer: MiFIDProfile }
  | {
      readonly status: "error"
      readonly kind: "request" | "data"
      readonly message: string
    }

const errorMessage = (cause: unknown) => {
  if (
    typeof cause === "object" &&
    cause !== null &&
    "reason" in cause &&
    typeof cause.reason === "string"
  ) {
    return cause.reason
  }

  if (cause instanceof Error) {
    return cause.message
  }

  return typeof cause === "string" ? cause : "An unknown error occurred"
}

const loadCustomer = async (signal: AbortSignal): Promise<CustomerState> => {
  let source: string

  try {
    const response = await fetch(customerFixtureUrl, { signal })

    if (!response.ok) {
      throw new Error(`Customer request failed (${response.status})`)
    }

    source = await response.text()
  } catch (cause) {
    return {
      status: "error",
      kind: "request",
      message: errorMessage(cause)
    }
  }

  try {
    const customer = await Effect.runPromise(importMiFIDJson(source))

    return { status: "loaded", customer }
  } catch (cause) {
    return {
      status: "error",
      kind: "data",
      message: errorMessage(cause)
    }
  }
}

export default function CustomerPage() {
  const [state, setState] = useState<CustomerState>({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController()

    void loadCustomer(controller.signal).then((nextState) => {
      if (!controller.signal.aborted) {
        setState(nextState)
      }
    })

    return () => controller.abort()
  }, [])

  if (state.status === "loading") {
    return (
      <main
        aria-busy="true"
        style={{ padding: "3rem", maxWidth: "48rem", margin: "0 auto" }}
      >
        <h1>Customer dashboard</h1>
        <p role="status">Loading customer data…</p>
      </main>
    )
  }

  if (state.status === "error") {
    const errorDescription =
      state.kind === "request"
        ? `The customer data could not be loaded: ${state.message}`
        : `The customer data is invalid: ${state.message}`

    return (
      <main style={{ padding: "3rem", maxWidth: "48rem", margin: "0 auto" }}>
        <h1>Unable to load customer</h1>
        <p role="alert">{errorDescription}</p>
      </main>
    )
  }

  return (
    <main style={{ padding: "3rem", maxWidth: "48rem", margin: "0 auto" }}>
      <h1>Customer dashboard</h1>
      <p>Customer data loaded for {state.customer.customerId}.</p>
    </main>
  )
}
