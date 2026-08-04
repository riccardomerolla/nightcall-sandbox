import {
  ASSET_CLASSES,
  type AssetClass,
  type PortfolioPosition
} from "../domain/portfolio"
import type {
  AssetClassAllocationPercentages,
  DeferredAdjustment,
  InstrumentReference,
  Portfolio,
  RebalancingProfile,
  RebalancingProposal,
  Trade,
  Violation
} from "./types"
import { detectSuitabilityViolations } from "./suitability"

const INVESTABLE_ASSET_CLASSES = ASSET_CLASSES.filter(
  (assetClass) => assetClass !== "cash"
)
const MONEY_COMPARISON_TOLERANCE_EUR = 1e-8

interface PositionPlanningState {
  readonly position: PortfolioPosition
  readonly originalValueEUR: number
  proposedValueEUR: number
}

interface PlanningState {
  readonly positions: ReadonlyArray<PositionPlanningState>
  readonly totalValueEUR: number
  readonly maxPositionValueEUR: number
  readonly minCashValueEUR: number
  unassignedCashEUR: number
  readonly trades: Trade[]
  readonly deferred: DeferredAdjustment[]
}

type SaleRationale =
  | "position-limit"
  | "target-allocation"
  | "minimum-cash"

interface PlannedSale {
  readonly amountEUR: number
  readonly rationale: SaleRationale
}

type PlannedSales = Map<PositionPlanningState, PlannedSale>

interface CashCredit {
  readonly candidate: PositionPlanningState
  readonly amountEUR: number
}

const instrumentReference = (
  position: PortfolioPosition
): InstrumentReference => ({
  isin: position.isin,
  name: position.name,
  assetClass: position.assetClass
})

const createPlanningState = (
  portfolio: Portfolio,
  profile: RebalancingProfile
): PlanningState => {
  const positions = portfolio.positions.map((position) => {
    const originalValueEUR = position.quantity * position.priceEur

    return { position, originalValueEUR, proposedValueEUR: originalValueEUR }
  })
  const totalValueEUR = positions.reduce(
    (total, position) => total + position.originalValueEUR,
    0
  )

  return {
    positions,
    totalValueEUR,
    maxPositionValueEUR:
      (profile.maxSinglePositionPct / 100) * totalValueEUR,
    minCashValueEUR: (profile.minCashPct / 100) * totalValueEUR,
    unassignedCashEUR: 0,
    trades: [],
    deferred: []
  }
}

const valueForAssetClass = (
  state: PlanningState,
  assetClass: AssetClass
): number =>
  state.positions.reduce(
    (total, candidate) =>
      candidate.position.assetClass === assetClass
        ? total + candidate.proposedValueEUR
        : total,
    assetClass === "cash" ? state.unassignedCashEUR : 0
  )

const allocationFromState = (
  state: PlanningState
): AssetClassAllocationPercentages => {
  const allocation: Record<AssetClass, number> = {
    equity: 0,
    government_bond: 0,
    corporate_bond: 0,
    commodity: 0,
    cash: 0
  }

  if (state.totalValueEUR === 0) {
    return allocation
  }

  for (const assetClass of ASSET_CLASSES) {
    allocation[assetClass] =
      (valueForAssetClass(state, assetClass) / state.totalValueEUR) * 100
  }

  return allocation
}

const candidatesForAssetClass = (
  state: PlanningState,
  assetClass: AssetClass
): ReadonlyArray<PositionPlanningState> =>
  state.positions.filter(
    ({ position }) => position.assetClass === assetClass
  )

const plannedSaleAmount = (
  candidate: PositionPlanningState,
  plannedSales: ReadonlyMap<PositionPlanningState, PlannedSale>
): number => plannedSales.get(candidate)?.amountEUR ?? 0

// Selling the largest remaining holdings first reduces concentration early.
const rankSellCandidates = (
  candidates: ReadonlyArray<PositionPlanningState>,
  plannedSales: ReadonlyMap<PositionPlanningState, PlannedSale> = new Map()
): ReadonlyArray<PositionPlanningState> =>
  [...candidates].sort(
    (left, right) =>
      right.proposedValueEUR - plannedSaleAmount(right, plannedSales) -
      (left.proposedValueEUR - plannedSaleAmount(left, plannedSales))
  )

// Buying the smallest holdings first spreads an allocation across instruments.
const rankBuyCandidates = (
  candidates: ReadonlyArray<PositionPlanningState>
): ReadonlyArray<PositionPlanningState> =>
  [...candidates].sort(
    (left, right) => left.proposedValueEUR - right.proposedValueEUR
  )

const cashPositions = (
  state: PlanningState
): ReadonlyArray<PositionPlanningState> =>
  candidatesForAssetClass(state, "cash")

const availableCashEUR = (state: PlanningState): number =>
  valueForAssetClass(state, "cash")

const creditCash = (
  state: PlanningState,
  amountEUR: number,
  excludedPosition?: PositionPlanningState
): ReadonlyArray<CashCredit> => {
  let remainingEUR = amountEUR
  const credits: CashCredit[] = []
  const eligibleCashPositions = cashPositions(state).filter(
    (cashPosition) => cashPosition !== excludedPosition
  )

  for (const cashPosition of rankBuyCandidates(eligibleCashPositions)) {
    const capacityEUR = Math.max(
      0,
      state.maxPositionValueEUR - cashPosition.proposedValueEUR
    )
    const creditedEUR = Math.min(remainingEUR, capacityEUR)

    cashPosition.proposedValueEUR += creditedEUR
    remainingEUR -= creditedEUR
    if (creditedEUR > MONEY_COMPARISON_TOLERANCE_EUR) {
      credits.push({ candidate: cashPosition, amountEUR: creditedEUR })
    }
  }

  // Sale proceeds remain part of cash when no cash position can hold them.
  state.unassignedCashEUR += remainingEUR

  return credits
}

const debitCash = (state: PlanningState, amountEUR: number): void => {
  const fromReserveEUR = Math.min(amountEUR, state.unassignedCashEUR)
  state.unassignedCashEUR -= fromReserveEUR
  let remainingEUR = amountEUR - fromReserveEUR

  for (const cashPosition of rankSellCandidates(cashPositions(state))) {
    const debitedEUR = Math.min(remainingEUR, cashPosition.proposedValueEUR)

    cashPosition.proposedValueEUR -= debitedEUR
    remainingEUR -= debitedEUR

    if (remainingEUR <= MONEY_COMPARISON_TOLERANCE_EUR) {
      return
    }
  }
}

const targetValue = (
  state: PlanningState,
  profile: RebalancingProfile,
  assetClass: AssetClass
): number => (profile.modelTarget[assetClass] / 100) * state.totalValueEUR

const addPlannedSale = (
  plannedSales: PlannedSales,
  candidate: PositionPlanningState,
  amountEUR: number,
  rationale: SaleRationale
): void => {
  if (amountEUR <= MONEY_COMPARISON_TOLERANCE_EUR) {
    return
  }

  const existingSale = plannedSales.get(candidate)

  plannedSales.set(candidate, {
    amountEUR: (existingSale?.amountEUR ?? 0) + amountEUR,
    rationale
  })
}

const calculateMandatorySales = (
  state: PlanningState,
  violations: ReadonlyArray<Violation>
): PlannedSales => {
  const plannedSales: PlannedSales = new Map()

  for (const violation of violations) {
    if (violation.constraint !== "maxSinglePositionPct") {
      continue
    }

    const candidate = state.positions.find(
      ({ position }) => position === violation.position
    )

    if (candidate === undefined) {
      continue
    }

    const maximumValueEUR =
      (violation.limitPct / 100) * state.totalValueEUR

    addPlannedSale(
      plannedSales,
      candidate,
      candidate.proposedValueEUR - maximumValueEUR,
      "position-limit"
    )
  }

  return plannedSales
}

const distributeSale = (
  candidates: ReadonlyArray<PositionPlanningState>,
  requestedAmountEUR: number,
  plannedSales: PlannedSales,
  rationale: SaleRationale
): number => {
  let remainingEUR = requestedAmountEUR

  for (const candidate of rankSellCandidates(candidates, plannedSales)) {
    if (remainingEUR <= MONEY_COMPARISON_TOLERANCE_EUR) {
      break
    }

    const availableValueEUR =
      candidate.proposedValueEUR - plannedSaleAmount(candidate, plannedSales)
    const additionalSaleEUR = Math.min(remainingEUR, availableValueEUR)

    addPlannedSale(
      plannedSales,
      candidate,
      additionalSaleEUR,
      rationale
    )
    remainingEUR -= additionalSaleEUR
  }

  return remainingEUR
}

const totalPlannedSales = (
  candidates: ReadonlyArray<PositionPlanningState>,
  plannedSales: ReadonlyMap<PositionPlanningState, PlannedSale>
): number =>
  candidates.reduce(
    (total, candidate) => total + plannedSaleAmount(candidate, plannedSales),
    0
  )

const distributeTargetSales = (
  state: PlanningState,
  profile: RebalancingProfile,
  plannedSales: PlannedSales
): void => {
  for (const assetClass of INVESTABLE_ASSET_CLASSES) {
    const candidates = candidatesForAssetClass(state, assetClass)
    const targetSaleEUR = Math.max(
      0,
      valueForAssetClass(state, assetClass) -
        targetValue(state, profile, assetClass)
    )
    const mandatorySaleEUR = totalPlannedSales(candidates, plannedSales)

    distributeSale(
      candidates,
      Math.max(0, targetSaleEUR - mandatorySaleEUR),
      plannedSales,
      "target-allocation"
    )

    const positionLimitDeterminesSale =
      mandatorySaleEUR >
      targetSaleEUR + MONEY_COMPARISON_TOLERANCE_EUR

    if (!positionLimitDeterminesSale) {
      for (const candidate of candidates) {
        const plannedSale = plannedSales.get(candidate)

        if (plannedSale !== undefined) {
          plannedSales.set(candidate, {
            amountEUR: plannedSale.amountEUR,
            rationale: "target-allocation"
          })
        }
      }
    }
  }
}

const cashAfterPlannedSales = (
  state: PlanningState,
  plannedSales: ReadonlyMap<PositionPlanningState, PlannedSale>
): number =>
  availableCashEUR(state) +
  state.positions.reduce(
    (total, candidate) =>
      candidate.position.assetClass === "cash"
        ? total
        : total + plannedSaleAmount(candidate, plannedSales),
    0
  )

const distributeMinimumCashSales = (
  state: PlanningState,
  plannedSales: PlannedSales,
  violations: ReadonlyArray<Violation>
): void => {
  const cashViolation = violations.find(
    (violation) => violation.constraint === "minCashPct"
  )

  if (cashViolation === undefined) {
    return
  }

  const projectedCashEUR = cashAfterPlannedSales(state, plannedSales)
  const minimumCashValueEUR =
    (cashViolation.limitPct / 100) * state.totalValueEUR
  const cashShortfallEUR = minimumCashValueEUR - projectedCashEUR

  if (cashShortfallEUR <= MONEY_COMPARISON_TOLERANCE_EUR) {
    return
  }

  const candidates = state.positions.filter(
    ({ position }) => position.assetClass !== "cash"
  )

  distributeSale(
    candidates,
    cashShortfallEUR,
    plannedSales,
    "minimum-cash"
  )
}

const distributeAdditionalSales = (
  state: PlanningState,
  profile: RebalancingProfile,
  plannedSales: PlannedSales,
  violations: ReadonlyArray<Violation>
): void => {
  distributeTargetSales(state, profile, plannedSales)
  distributeMinimumCashSales(state, plannedSales, violations)
}

const saleRationale = (
  assetClass: AssetClass,
  rationale: SaleRationale
): string => {
  const assetClassLabel = assetClass.replaceAll("_", " ")

  switch (rationale) {
    case "position-limit":
      return `Reduce ${assetClassLabel} to satisfy the single-position limit.`
    case "target-allocation":
      return `Reduce ${assetClassLabel} toward its target allocation.`
    case "minimum-cash":
      return "Increase cash to satisfy the minimum cash allocation."
  }
}

const cashFloorBuyAmountEUR = (
  state: PlanningState,
  violations: ReadonlyArray<Violation>
): number => {
  const cashViolation = violations.find(
    (violation) => violation.constraint === "minCashPct"
  )

  return cashViolation === undefined
    ? 0
    : (cashViolation.limitPct / 100) * state.totalValueEUR -
        availableCashEUR(state)
}

const applyPlannedSales = (
  state: PlanningState,
  plannedSales: ReadonlyMap<PositionPlanningState, PlannedSale>,
  cashBuyAmountEUR: number
): void => {
  let remainingCashBuyEUR = cashBuyAmountEUR

  for (const assetClass of ASSET_CLASSES) {
    const candidates = rankSellCandidates(
      candidatesForAssetClass(state, assetClass)
    )

    for (const candidate of candidates) {
      const plannedSale = plannedSales.get(candidate)

      if (plannedSale === undefined) {
        continue
      }

      candidate.proposedValueEUR -= plannedSale.amountEUR
      const cashCredits = creditCash(
        state,
        plannedSale.amountEUR,
        assetClass === "cash" ? candidate : undefined
      )
      state.trades.push({
        instrument: instrumentReference(candidate.position),
        action: "sell",
        amountEUR: plannedSale.amountEUR,
        rationale: saleRationale(assetClass, plannedSale.rationale)
      })

      for (const credit of cashCredits) {
        const amountEUR = Math.min(remainingCashBuyEUR, credit.amountEUR)

        if (amountEUR <= MONEY_COMPARISON_TOLERANCE_EUR) {
          break
        }

        state.trades.push({
          instrument: instrumentReference(credit.candidate.position),
          action: "buy",
          amountEUR,
          rationale: "Increase cash to satisfy the minimum cash allocation."
        })
        remainingCashBuyEUR -= amountEUR
      }
    }
  }
}

const planSales = (
  state: PlanningState,
  profile: RebalancingProfile,
  violations: ReadonlyArray<Violation>
): void => {
  const plannedSales = calculateMandatorySales(state, violations)

  distributeAdditionalSales(state, profile, plannedSales, violations)
  applyPlannedSales(
    state,
    plannedSales,
    cashFloorBuyAmountEUR(state, violations)
  )
}

const planPurchases = (
  state: PlanningState,
  profile: RebalancingProfile
): void => {
  for (const assetClass of INVESTABLE_ASSET_CLASSES) {
    let amountToBuyEUR =
      targetValue(state, profile, assetClass) -
      valueForAssetClass(state, assetClass)

    if (amountToBuyEUR <= MONEY_COMPARISON_TOLERANCE_EUR) {
      continue
    }

    const candidates = rankBuyCandidates(
      candidatesForAssetClass(state, assetClass)
    )
    const firstCandidate = candidates[0]

    if (firstCandidate === undefined) {
      state.deferred.push({
        assetClass,
        amountEUR: amountToBuyEUR,
        reason: "No existing position is available for this asset class."
      })
      continue
    }

    let deferralReason = "The single-position limit prevents this adjustment."

    for (const candidate of candidates) {
      const positionCapacityEUR = Math.max(
        0,
        state.maxPositionValueEUR - candidate.proposedValueEUR
      )
      const cashCapacityEUR = Math.max(
        0,
        availableCashEUR(state) - state.minCashValueEUR
      )
      const amountEUR = Math.min(
        amountToBuyEUR,
        positionCapacityEUR,
        cashCapacityEUR
      )

      if (amountEUR <= MONEY_COMPARISON_TOLERANCE_EUR) {
        if (cashCapacityEUR <= MONEY_COMPARISON_TOLERANCE_EUR) {
          deferralReason =
            "The minimum cash allocation prevents this adjustment."
        }
        continue
      }

      candidate.proposedValueEUR += amountEUR
      debitCash(state, amountEUR)
      state.trades.push({
        instrument: instrumentReference(candidate.position),
        action: "buy",
        amountEUR,
        rationale: `Increase ${assetClass.replaceAll("_", " ")} toward its target allocation.`
      })
      amountToBuyEUR -= amountEUR
    }

    if (amountToBuyEUR > MONEY_COMPARISON_TOLERANCE_EUR) {
      state.deferred.push({
        instrument: instrumentReference(firstCandidate.position),
        amountEUR: amountToBuyEUR,
        reason: deferralReason
      })
    }
  }
}

export const proposeRebalancing = (
  portfolio: Portfolio,
  profile: RebalancingProfile
): RebalancingProposal => {
  const state = createPlanningState(portfolio, profile)
  const beforeAllocation = allocationFromState(state)
  const violations = detectSuitabilityViolations(portfolio, profile)

  if (state.totalValueEUR === 0) {
    return {
      beforeAllocation,
      afterAllocation: beforeAllocation,
      trades: [],
      deferred: [],
      violations
    }
  }

  planSales(state, profile, violations)
  planPurchases(state, profile)

  return {
    beforeAllocation,
    afterAllocation: allocationFromState(state),
    trades: state.trades,
    deferred: state.deferred,
    violations
  }
}
