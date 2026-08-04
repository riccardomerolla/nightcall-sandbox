"use client"

import { Effect } from "effect"
import Link from "next/link"
import { useEffect, useState } from "react"

import { MODEL_TARGET_ALLOCATION_PERCENTAGES } from "../../../lib/domain/models"
import type { MiFIDProfile } from "../../../lib/domain/mifid"
import {
  ASSET_CLASSES,
  type Portfolio
} from "../../../lib/domain/portfolio"
import { formatEUR } from "../../../lib/format/currency"
import { formatPercent } from "../../../lib/format/percent"
import { importMiFIDJson } from "../../../lib/importers/mifid-json"
import { importPortfolioCsv } from "../../../lib/importers/portfolio-csv"
import { proposeRebalancing } from "../../../lib/rebalance/propose"
import type { RebalancingProposal } from "../../../lib/rebalance/types"

const customerFixtureUrl = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/fixtures/mifid-mario-rossi.json`
const portfolioFixtureUrl = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/fixtures/portfolio-mario-rossi.csv`

type ProposalState =
  | { readonly status: "loading" }
  | {
      readonly status: "loaded"
      readonly customer: MiFIDProfile
      readonly proposal: RebalancingProposal
    }
  | {
      readonly status: "error"
      readonly kind: "request" | "data"
      readonly source: "customer" | "portfolio"
      readonly message: string
    }

const errorMessage = (cause: unknown): string => {
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

const formatUnderscoreDelimitedIdentifier = (identifier: string): string =>
  identifier
    .replaceAll("_", " ")
    .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase())

const deferredAdjustmentLabel = (
  adjustment: RebalancingProposal["deferred"][number]
): string =>
  "instrument" in adjustment
    ? adjustment.instrument.name
    : `${formatUnderscoreDelimitedIdentifier(adjustment.assetClass)} (no existing position)`

const deferredAdjustmentKey = (
  adjustment: RebalancingProposal["deferred"][number]
): string =>
  "instrument" in adjustment
    ? adjustment.instrument.isin
    : `asset-class-${adjustment.assetClass}`

const fetchFixture = async (
  url: string,
  label: "Customer" | "Portfolio",
  signal: AbortSignal
): Promise<string> => {
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`${label} request failed (${response.status})`)
  }

  return response.text()
}

const loadProposal = async (signal: AbortSignal): Promise<ProposalState> => {
  let customerResponseBody: string

  try {
    customerResponseBody = await fetchFixture(
      customerFixtureUrl,
      "Customer",
      signal
    )
  } catch (cause) {
    return {
      status: "error",
      kind: "request",
      source: "customer",
      message: errorMessage(cause)
    }
  }

  let customer: MiFIDProfile

  try {
    customer = await Effect.runPromise(importMiFIDJson(customerResponseBody))
  } catch (cause) {
    return {
      status: "error",
      kind: "data",
      source: "customer",
      message: errorMessage(cause)
    }
  }

  let portfolioResponseBody: string

  try {
    portfolioResponseBody = await fetchFixture(
      portfolioFixtureUrl,
      "Portfolio",
      signal
    )
  } catch (cause) {
    return {
      status: "error",
      kind: "request",
      source: "portfolio",
      message: errorMessage(cause)
    }
  }

  let portfolio: Portfolio

  try {
    portfolio = await Effect.runPromise(
      importPortfolioCsv(portfolioResponseBody)
    )
  } catch (cause) {
    return {
      status: "error",
      kind: "data",
      source: "portfolio",
      message: errorMessage(cause)
    }
  }

  const proposal = proposeRebalancing(portfolio, {
    modelTarget: MODEL_TARGET_ALLOCATION_PERCENTAGES[customer.riskProfile],
    minCashPct: customer.constraints.minCashPct,
    maxSinglePositionPct: customer.constraints.maxSinglePositionPct
  })

  return { status: "loaded", customer, proposal }
}

const BackToDashboardLink = () => (
  <p>
    <Link href="/customer">Back to customer dashboard</Link>
  </p>
)

export default function ProposalPage() {
  const [state, setState] = useState<ProposalState>({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController()

    void loadProposal(controller.signal).then((nextState) => {
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
        <h1>Rebalancing proposal</h1>
        <p role="status">Loading customer data…</p>
        <BackToDashboardLink />
      </main>
    )
  }

  if (state.status === "error") {
    const sourceLabel = state.source === "customer" ? "customer" : "portfolio"
    const errorDescription =
      state.kind === "request"
        ? `The ${sourceLabel} data could not be loaded: ${state.message}`
        : `The ${sourceLabel} data is invalid: ${state.message}`

    return (
      <main style={{ padding: "3rem", maxWidth: "48rem", margin: "0 auto" }}>
        <h1>Unable to load {sourceLabel}</h1>
        <p role="alert">{errorDescription}</p>
        <BackToDashboardLink />
      </main>
    )
  }

  const totalTurnover = state.proposal.trades.reduce(
    (total, trade) => total + trade.amountEUR,
    0
  )

  return (
    <main style={{ padding: "3rem", maxWidth: "48rem", margin: "0 auto" }}>
      <header>
        <p>Customer proposal</p>
        <h1>Rebalancing proposal</h1>
        <p>Prepared for {state.customer.fullName}.</p>
        <BackToDashboardLink />
      </header>

      <section aria-labelledby="allocation-heading">
        <h2 id="allocation-heading">Allocation comparison</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">Asset class</th>
              <th scope="col">Before</th>
              <th scope="col">After</th>
            </tr>
          </thead>
          <tbody>
            {ASSET_CLASSES.map((assetClass) => (
              <tr key={assetClass}>
                <th scope="row">
                  {formatUnderscoreDelimitedIdentifier(assetClass)}
                </th>
                <td>{formatPercent(state.proposal.beforeAllocation[assetClass])}</td>
                <td>{formatPercent(state.proposal.afterAllocation[assetClass])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading">Proposal summary</h2>
        <dl>
          <dt>Trade count</dt>
          <dd>{state.proposal.trades.length}</dd>
          <dt>Total turnover</dt>
          <dd>{formatEUR(totalTurnover)}</dd>
          <dt>Resulting cash allocation</dt>
          <dd>{formatPercent(state.proposal.afterAllocation.cash)}</dd>
        </dl>
      </section>

      <section aria-labelledby="trades-heading">
        <h2 id="trades-heading">Proposed trades</h2>
        {state.proposal.trades.length === 0 ? (
          <p>No trades are proposed.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Instrument</th>
                <th scope="col">Amount</th>
                <th scope="col">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {state.proposal.trades.map((trade) => (
                <tr key={`${trade.action}-${trade.instrument.isin}`}>
                  <td>{formatUnderscoreDelimitedIdentifier(trade.action)}</td>
                  <th scope="row">{trade.instrument.name}</th>
                  <td>{formatEUR(trade.amountEUR)}</td>
                  <td>{trade.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="deferred-heading">
        <h2 id="deferred-heading">Deferred adjustments</h2>
        {state.proposal.deferred.length === 0 ? (
          <p>No adjustments are deferred.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Instrument</th>
                <th scope="col">Amount</th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              {state.proposal.deferred.map((adjustment) => (
                <tr key={deferredAdjustmentKey(adjustment)}>
                  <th scope="row">{deferredAdjustmentLabel(adjustment)}</th>
                  <td>{formatEUR(adjustment.amountEUR)}</td>
                  <td>{adjustment.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
