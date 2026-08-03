import { Schema } from "effect"

export class PortfolioRowError extends Schema.TaggedErrorClass<PortfolioRowError>()(
  "PortfolioRowError",
  {
    row: Schema.Number,
    reason: Schema.String
  }
) {}
