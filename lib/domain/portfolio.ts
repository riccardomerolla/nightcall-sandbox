import { Schema } from "effect"

export const AssetClass = Schema.Literals([
  "equity",
  "government_bond",
  "corporate_bond",
  "commodity",
  "cash"
])

export type AssetClass = typeof AssetClass.Type

const NonEmptyString = Schema.String.check(Schema.isMinLength(1))
const PositiveNumber = Schema.Finite.check(Schema.isGreaterThan(0))
const NonNegativeNumber = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))

export class PortfolioPosition extends Schema.Class<PortfolioPosition>(
  "PortfolioPosition"
)({
  isin: NonEmptyString,
  name: NonEmptyString,
  assetClass: AssetClass,
  quantity: PositiveNumber,
  priceEur: NonNegativeNumber,
  currency: Schema.Literal("EUR")
}) {}

export class Portfolio extends Schema.Class<Portfolio>("Portfolio")({
  positions: Schema.Array(PortfolioPosition).check(Schema.isNonEmpty())
}) {}
