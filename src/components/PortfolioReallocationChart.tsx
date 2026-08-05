import { useId } from "react"

import { ASSET_CLASSES, type AssetClass } from "../../lib/domain/portfolio"
import type { AssetClassAllocationPercentages } from "../../lib/rebalance/types"
import { formatPercent } from "../../lib/format/percent"

export interface PortfolioReallocationChartProps {
  readonly beforeAllocation: AssetClassAllocationPercentages
  readonly afterAllocation: AssetClassAllocationPercentages
}

interface ReallocationRow {
  readonly assetClass: AssetClass
  readonly before: number
  readonly after: number
}

const assetClassLabel = (assetClass: AssetClass): string =>
  assetClass
    .replaceAll("_", " ")
    .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase())

const reallocationRows = (
  beforeAllocation: AssetClassAllocationPercentages,
  afterAllocation: AssetClassAllocationPercentages
): ReadonlyArray<ReallocationRow> =>
  ASSET_CLASSES.map((assetClass) => ({
    assetClass,
    before: beforeAllocation[assetClass],
    after: afterAllocation[assetClass]
  })).filter(
    ({ before, after }) =>
      (Number.isFinite(before) && before > 0) ||
      (Number.isFinite(after) && after > 0)
  )

export const PortfolioReallocationChart = ({
  beforeAllocation,
  afterAllocation
}: PortfolioReallocationChartProps) => {
  const componentId = useId()
  const headingId = `${componentId}-heading`
  const summaryId = `${componentId}-summary`
  const rows = reallocationRows(beforeAllocation, afterAllocation)

  if (rows.length === 0) {
    return (
      <figure
        className="portfolio-reallocation-chart portfolio-section"
        aria-labelledby={headingId}
        aria-describedby={summaryId}
      >
        <h2 id={headingId}>Portfolio reallocation</h2>
        <figcaption id={summaryId} className="allocation-empty-state">
          Portfolio reallocation is unavailable because this proposal has no
          positive-value allocations.
        </figcaption>
      </figure>
    )
  }

  const summary = `Portfolio reallocation. ${rows
    .map(
      ({ assetClass, before, after }) =>
        `${assetClassLabel(assetClass)}: ${formatPercent(before)} before, ${formatPercent(after)} after`
    )
    .join("; ")}. Percentages are rounded to one decimal place.`

  return (
    <figure
      className="portfolio-reallocation-chart portfolio-section"
      aria-labelledby={headingId}
      aria-describedby={summaryId}
    >
      <h2 id={headingId}>Portfolio reallocation</h2>
      <figcaption
        id={summaryId}
        className="portfolio-reallocation-chart__summary"
      >
        {summary}
      </figcaption>
      <ul className="portfolio-reallocation-chart__legend-key">
        <li>
          <span
            className="portfolio-reallocation-chart__swatch portfolio-reallocation-chart__swatch--before"
            aria-hidden="true"
          />
          Before
        </li>
        <li>
          <span
            className="portfolio-reallocation-chart__swatch portfolio-reallocation-chart__swatch--after"
            aria-hidden="true"
          />
          After
        </li>
      </ul>
      <ul className="portfolio-reallocation-chart__rows">
        {rows.map(({ assetClass, before, after }) => (
          <li
            key={assetClass}
            className="portfolio-reallocation-chart__row"
            data-asset-class={assetClass}
          >
            <span className="portfolio-reallocation-chart__row-label">
              {assetClassLabel(assetClass)}
            </span>
            <span
              className="portfolio-reallocation-chart__bars"
              role="img"
              aria-label={`${assetClassLabel(assetClass)}: ${formatPercent(before)} before, ${formatPercent(after)} after`}
            >
              <span className="portfolio-reallocation-chart__bar-track">
                <span
                  className="portfolio-reallocation-chart__bar portfolio-reallocation-chart__bar--before"
                  data-asset-class={assetClass}
                  style={{ width: `${before}%` }}
                />
              </span>
              <span className="portfolio-reallocation-chart__bar-track">
                <span
                  className="portfolio-reallocation-chart__bar portfolio-reallocation-chart__bar--after"
                  data-asset-class={assetClass}
                  style={{ width: `${after}%` }}
                />
              </span>
            </span>
            <span className="portfolio-reallocation-chart__values">
              <strong>{formatPercent(before)}</strong>
              {" → "}
              <strong>{formatPercent(after)}</strong>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
