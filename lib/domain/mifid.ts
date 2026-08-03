import { Schema } from "effect"

const riskProfileValues = [
  "conservative",
  "cautious",
  "balanced",
  "growth",
  "aggressive"
] as const

export const RiskProfile = Schema.Literals(riskProfileValues)

export type RiskProfile = typeof RiskProfile.Type

export const KnowledgeLevel = Schema.Literals([
  "basic",
  "informed",
  "advanced"
])

export type KnowledgeLevel = typeof KnowledgeLevel.Type

const NonEmptyString = Schema.String.check(Schema.isMinLength(1))
const AssessmentDate = Schema.String.check(
  Schema.isPattern(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/),
  Schema.makeFilter((value: string) => {
    const date = new Date(`${value}T00:00:00.000Z`)

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, { expected: "a real calendar date in YYYY-MM-DD format" })
)
const Percentage = Schema.Finite.check(
  Schema.isBetween({ minimum: 0, maximum: 100 })
)

export class MiFIDConstraints extends Schema.Class<MiFIDConstraints>(
  "MiFIDConstraints"
)({
  maxSinglePositionPct: Percentage,
  minCashPct: Percentage
}) {}

export class MiFIDProfile extends Schema.Class<MiFIDProfile>("MiFIDProfile")({
  customerId: NonEmptyString,
  fullName: NonEmptyString,
  assessedAt: AssessmentDate,
  riskProfile: RiskProfile,
  riskProfileScale: Schema.Tuple(RiskProfile.members),
  investmentHorizonYears: Schema.Int.check(Schema.isGreaterThan(0)),
  knowledgeLevel: KnowledgeLevel,
  sustainabilityPreference: Schema.Boolean,
  objectives: Schema.Array(NonEmptyString).check(Schema.isNonEmpty()),
  constraints: MiFIDConstraints
}) {}
