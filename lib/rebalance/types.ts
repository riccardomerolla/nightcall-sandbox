import type {
  AssetClass,
  Portfolio as DomainPortfolio,
  PortfolioPosition
} from "../domain/portfolio"

export type Portfolio = DomainPortfolio

export type AssetClassAllocationPercentages = Readonly<
  Record<AssetClass, number>
>

export interface RebalancingProfile {
  readonly modelTarget: AssetClassAllocationPercentages
  readonly minCashPct: number
  readonly maxSinglePositionPct: number
}

export type InstrumentReference = Pick<
  PortfolioPosition,
  "isin" | "name" | "assetClass"
>

export type TradeAction = "buy" | "sell"

export interface Trade {
  readonly instrument: InstrumentReference
  readonly action: TradeAction
  readonly amountEUR: number
  readonly rationale: string
}

export type DeferredAdjustment =
  | {
      readonly instrument: InstrumentReference
      readonly amountEUR: number
      readonly reason: string
    }
  | {
      readonly assetClass: AssetClass
      readonly amountEUR: number
      readonly reason: string
    }

export type Violation =
  | {
      readonly constraint: "maxSinglePositionPct"
      readonly position: PortfolioPosition
      readonly actualPct: number
      readonly limitPct: number
    }
  | {
      readonly constraint: "minCashPct"
      readonly assetClass: "cash"
      readonly actualPct: number
      readonly limitPct: number
    }

export interface RebalancingProposal {
  readonly beforeAllocation: AssetClassAllocationPercentages
  readonly afterAllocation: AssetClassAllocationPercentages
  readonly trades: ReadonlyArray<Trade>
  readonly deferred: ReadonlyArray<DeferredAdjustment>
  readonly violations: ReadonlyArray<Violation>
}
