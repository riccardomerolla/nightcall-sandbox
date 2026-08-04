import { useId, type CSSProperties } from "react"

import { positionsWithWeights } from "../../lib/analytics/allocation"
import type { PortfolioPosition } from "../../lib/domain/portfolio"
import { formatPercent } from "../../lib/format/percent"

export interface PortfolioAllocationChartProps {
  readonly holdings: ReadonlyArray<PortfolioPosition>
}

interface AllocationSegment {
  readonly holding: PortfolioPosition
  readonly percentage: number
  readonly startPercentage: number
}

const ALLOCATION_COLOUR_COUNT = 7

const colourStyle = (index: number) =>
  ({
    "--portfolio-allocation-colour": `var(--portfolio-allocation-colour-${
      (index % ALLOCATION_COLOUR_COUNT) + 1
    })`
  }) as CSSProperties

const allocationSegments = (
  holdings: ReadonlyArray<PortfolioPosition>
): ReadonlyArray<AllocationSegment> => {
  let startPercentage = 0

  return positionsWithWeights(holdings)
    .filter(({ weightPct }) => Number.isFinite(weightPct) && weightPct > 0)
    .map(({ position: holding, weightPct: percentage }) => {
      const segment = { holding, percentage, startPercentage }
      startPercentage += percentage
      return segment
    })
}

export const PortfolioAllocationChart = ({
  holdings
}: PortfolioAllocationChartProps) => {
  const componentId = useId()
  const headingId = `${componentId}-heading`
  const summaryId = `${componentId}-summary`
  const segments = allocationSegments(holdings)

  if (segments.length === 0) {
    return (
      <figure
        className="portfolio-allocation-chart portfolio-section"
        aria-labelledby={headingId}
        aria-describedby={summaryId}
      >
        <h2 id={headingId}>Portfolio allocation</h2>
        <figcaption id={summaryId} className="allocation-empty-state">
          Portfolio allocation is unavailable because this portfolio has no
          positive-value holdings.
        </figcaption>
      </figure>
    )
  }

  const summary = `Portfolio allocation. ${segments
    .map(
      ({ holding, percentage }) =>
        `${holding.name}: ${formatPercent(percentage)}`
    )
    .join("; ")}. Percentages are rounded to one decimal place.`

  return (
    <figure
      className="portfolio-allocation-chart portfolio-section"
      aria-labelledby={headingId}
      aria-describedby={summaryId}
    >
      <h2 id={headingId}>Portfolio allocation</h2>
      <figcaption
        id={summaryId}
        className="portfolio-allocation-chart__summary"
      >
        {summary}
      </figcaption>
      <svg
        className="portfolio-allocation-chart__graphic"
        viewBox="0 0 100 16"
        preserveAspectRatio="none"
        role="img"
        aria-labelledby={headingId}
        aria-describedby={summaryId}
      >
        {segments.map(({ holding, percentage, startPercentage }, index) => {
          const labelId = `${componentId}-label-${index}`

          return (
            <rect
              key={`${holding.isin}-${index}`}
              x={startPercentage}
              y="0"
              width={percentage}
              height="16"
              rx="0.5"
              style={colourStyle(index)}
              aria-labelledby={labelId}
              data-holding-id={holding.isin}
            />
          )
        })}
      </svg>
      <ul className="portfolio-allocation-chart__legend">
        {segments.map(({ holding, percentage }, index) => {
          const labelId = `${componentId}-label-${index}`

          return (
            <li
              key={`${holding.isin}-${index}`}
              id={labelId}
              style={colourStyle(index)}
              data-holding-id={holding.isin}
            >
              <span
                className="portfolio-allocation-chart__swatch"
                aria-hidden="true"
              />
              <span className="portfolio-allocation-chart__label">
                {holding.name}:
              </span>
              <strong>{formatPercent(percentage)}</strong>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
