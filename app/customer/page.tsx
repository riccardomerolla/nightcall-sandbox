"use client"

import { Effect } from "effect"
import Link from "next/link"
import { useEffect, useState } from "react"

import { positionsWithWeights } from "../../lib/analytics/allocation"
import {
  suitabilityReport,
  type SuitabilityViolation
} from "../../lib/analytics/suitability"
import type { MiFIDProfile } from "../../lib/domain/mifid"
import type { Portfolio } from "../../lib/domain/portfolio"
import { formatEUR } from "../../lib/format/currency"
import { formatPercent } from "../../lib/format/percent"
import { importMiFIDJson } from "../../lib/importers/mifid-json"
import { importPortfolioCsv } from "../../lib/importers/portfolio-csv"
import styles from "./customer.module.css"

const customerFixtureUrl = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/fixtures/mifid-mario-rossi.json`
const portfolioFixtureUrl = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/fixtures/portfolio-mario-rossi.csv`

type DashboardState =
  | { readonly status: "loading" }
  | {
      readonly status: "loaded"
      readonly customer: MiFIDProfile
      readonly portfolio: Portfolio
    }
  | {
      readonly status: "error"
      readonly kind: "request" | "data"
      readonly source: "customer" | "portfolio"
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

const formatUnderscoreDelimitedIdentifier = (identifier: string) =>
  identifier
    .replaceAll("_", " ")
    .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase())

const formatInvestmentHorizon = (years: number) =>
  `${years} ${years === 1 ? "year" : "years"}`

const describeDeviation = (deviationPct: number) => {
  if (deviationPct > 0) {
    return `Above target +${formatPercent(deviationPct)}`
  }

  if (deviationPct < 0) {
    return `Below target ${formatPercent(deviationPct)}`
  }

  return `On target ${formatPercent(deviationPct)}`
}

const describeSuitabilityViolation = (violation: SuitabilityViolation): string => {
  switch (violation.constraint) {
    case "maxSinglePositionPct":
      return `${violation.position.name} is ${formatPercent(violation.actualPct)} of the portfolio, above the ${formatPercent(violation.limitPct)} maximum.`
    case "minCashPct":
      return `Cash is ${formatPercent(violation.actualPct)} of the portfolio, below the ${formatPercent(violation.limitPct)} minimum.`
    default: {
      const unhandledViolation: never = violation
      return unhandledViolation
    }
  }
}

const fetchFixture = async (
  url: string,
  label: "Customer" | "Portfolio",
  signal: AbortSignal
) => {
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`${label} request failed (${response.status})`)
  }

  return response.text()
}

const loadDashboard = async (signal: AbortSignal): Promise<DashboardState> => {
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

  try {
    const portfolio = await Effect.runPromise(
      importPortfolioCsv(portfolioResponseBody)
    )

    return { status: "loaded", customer, portfolio }
  } catch (cause) {
    return {
      status: "error",
      kind: "data",
      source: "portfolio",
      message: errorMessage(cause)
    }
  }
}

export default function CustomerPage() {
  const [state, setState] = useState<DashboardState>({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController()

    void loadDashboard(controller.signal).then((nextState) => {
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
        className={`${styles.dashboard} ${styles.statePage}`}
      >
        <div className={styles.statePanel}>
          <h1 className={styles.stateTitle}>Customer dashboard</h1>
          <p className={styles.stateMessage} role="status">
            Loading customer data…
          </p>
        </div>
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
      <main className={`${styles.dashboard} ${styles.statePage}`}>
        <div className={styles.statePanel}>
          <h1 className={styles.stateTitle}>Unable to load {sourceLabel}</h1>
          <p className={styles.stateMessage} role="alert">
            {errorDescription}
          </p>
        </div>
      </main>
    )
  }

  const weightedPositions = positionsWithWeights(state.portfolio.positions)
  const portfolioValue = state.portfolio.positions.reduce(
    (total, position) => total + position.quantity * position.priceEur,
    0
  )
  const suitability = suitabilityReport(
    state.portfolio,
    state.customer
  )

  return (
    <main className={styles.dashboard}>
      <header
        aria-labelledby="customer-name"
        className={styles.portfolioHeader}
      >
        <div className={styles.headerTopline}>
          <div>
            <p className={styles.eyebrow}>Customer portfolio</p>
            <h1 className={styles.customerName} id="customer-name">
              {state.customer.fullName}
            </h1>
            <p className={styles.customerReference}>
              Customer data loaded for {state.customer.customerId}.
            </p>
          </div>
          <Link className={styles.headerAction} href="/customer/proposal">
            View rebalancing proposal
          </Link>
        </div>
        <dl className={styles.portfolioSummary}>
          <div className={styles.primaryMetric}>
            <dt>Portfolio value</dt>
            <dd>{formatEUR(portfolioValue)}</dd>
          </div>
          <div className={styles.supportingMetric}>
            <dt>Risk profile</dt>
            <dd>
              {formatUnderscoreDelimitedIdentifier(state.customer.riskProfile)}
            </dd>
          </div>
          <div className={styles.supportingMetric}>
            <dt>Investment horizon</dt>
            <dd>
              {formatInvestmentHorizon(
                state.customer.investmentHorizonYears
              )}
            </dd>
          </div>
          <div className={styles.supportingMetric}>
            <dt>Objectives</dt>
            <dd>
              {state.customer.objectives
                .map(formatUnderscoreDelimitedIdentifier)
                .join(", ")}
            </dd>
          </div>
        </dl>
      </header>
      <section
        aria-labelledby="positions-heading"
        className={styles.dataSection}
      >
        <h2 id="positions-heading">Positions</h2>
        <table className={styles.responsiveTable}>
          <thead>
            <tr>
              <th scope="col">Instrument</th>
              <th scope="col">Market value</th>
              <th scope="col">Portfolio weight</th>
            </tr>
          </thead>
          <tbody>
            {weightedPositions.map(({ position, weightPct }) => (
              <tr key={position.isin}>
                <th data-label="Instrument" scope="row">
                  {position.name}
                </th>
                <td data-label="Market value">
                  {formatEUR(position.quantity * position.priceEur)}
                </td>
                <td data-label="Portfolio weight">
                  {formatPercent(weightPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section
        aria-labelledby="allocation-heading"
        className={styles.dataSection}
      >
        <h2 id="allocation-heading">Allocation comparison</h2>
        <table className={styles.responsiveTable}>
          <thead>
            <tr>
              <th scope="col">Asset class</th>
              <th scope="col">Current</th>
              <th scope="col">Target</th>
              <th scope="col">Deviation</th>
            </tr>
          </thead>
          <tbody>
            {suitability.deviations.map(
              ({ assetClass, actualPct, targetPct, deviationPct }) => (
                <tr key={assetClass}>
                  <th data-label="Asset class" scope="row">
                    {formatUnderscoreDelimitedIdentifier(assetClass)}
                  </th>
                  <td data-label="Current">{formatPercent(actualPct)}</td>
                  <td data-label="Target">{formatPercent(targetPct)}</td>
                  <td data-label="Deviation">
                    {describeDeviation(deviationPct)}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </section>
      <section
        aria-labelledby="suitability-heading"
        className={styles.dataSection}
      >
        <h2 id="suitability-heading">Suitability violations</h2>
        {suitability.violations.length === 0 ? (
          <p className={styles.emptyState}>
            No suitability violations detected.
          </p>
        ) : (
          <ul>
            {suitability.violations.map((violation) => (
              <li
                key={
                  violation.constraint === "maxSinglePositionPct"
                    ? `${violation.constraint}-${violation.position.isin}`
                    : violation.constraint
                }
              >
                {describeSuitabilityViolation(violation)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
