"use client"

import { Effect } from "effect"
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
import { PortfolioAllocationChart } from "../../src/components/PortfolioAllocationChart"
import { ActionLink } from "../../src/components/ui/ActionLink"
import { Card } from "../../src/components/ui/Card"
import { EmptyState } from "../../src/components/ui/EmptyState"
import { PageContainer } from "../../src/components/ui/PageContainer"
import { PageHeader } from "../../src/components/ui/PageHeader"
import { StatusPanel } from "../../src/components/ui/StatusPanel"
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
      <StatusPanel
        busy
        message="Loading customer data…"
        messageRole="status"
        title="Customer dashboard"
      />
    )
  }

  if (state.status === "error") {
    const sourceLabel = state.source === "customer" ? "customer" : "portfolio"
    const errorDescription =
      state.kind === "request"
        ? `The ${sourceLabel} data could not be loaded: ${state.message}`
        : `The ${sourceLabel} data is invalid: ${state.message}`

    return (
      <StatusPanel
        message={errorDescription}
        messageRole="alert"
        title={`Unable to load ${sourceLabel}`}
      />
    )
  }

  const weightedPositions = positionsWithWeights(state.portfolio.positions)
  const portfolioValue = state.portfolio.positions.reduce(
    (total, position) => total + position.quantity * position.priceEur,
    0
  )
  const suitability = suitabilityReport(state.portfolio, state.customer)

  return (
    <PageContainer as="main" className={styles.dashboard}>
      <PageHeader
        actions={
          <ActionLink href="/customer/proposal">
            View rebalancing proposal
          </ActionLink>
        }
        className={styles.portfolioHeader}
        description={`Customer data loaded for ${state.customer.customerId}.`}
        eyebrow="Customer portfolio"
        title={state.customer.fullName}
        titleId="customer-name"
      >
        <Card className={styles.summaryCard}>
          <dl
            aria-label="Portfolio summary"
            className={styles.portfolioSummary}
          >
            <div className={styles.primaryMetric}>
              <dt>Portfolio value</dt>
              <dd>{formatEUR(portfolioValue)}</dd>
            </div>
            <div className={styles.supportingMetric}>
              <dt>Risk profile</dt>
              <dd>
                {formatUnderscoreDelimitedIdentifier(
                  state.customer.riskProfile
                )}
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
        </Card>
      </PageHeader>

      <div className={styles.dashboardGrid}>
        <Card
          aria-labelledby="positions-heading"
          as="section"
          className={styles.dataSection}
        >
          <h2 id="positions-heading">Positions</h2>
          <div className={styles.tableFrame}>
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
          </div>
        </Card>

        <Card className={`${styles.dataSection} ${styles.chartCard}`}>
          <PortfolioAllocationChart holdings={state.portfolio.positions} />
        </Card>

        <Card
          aria-labelledby="allocation-heading"
          as="section"
          className={`${styles.dataSection} ${styles.allocationCard}`}
        >
          <h2 id="allocation-heading">Allocation comparison</h2>
          <div className={styles.tableFrame}>
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
          </div>
        </Card>

        <Card
          aria-labelledby="suitability-heading"
          as="section"
          className={`${styles.dataSection} ${styles.suitabilityCard}`}
        >
          <h2 id="suitability-heading">Suitability violations</h2>
          {suitability.violations.length === 0 ? (
            <EmptyState>No suitability violations detected.</EmptyState>
          ) : (
            <ul className={styles.violationList}>
              {suitability.violations.map((violation) => (
                <li
                  className={styles.violationItem}
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
        </Card>
      </div>
    </PageContainer>
  )
}
