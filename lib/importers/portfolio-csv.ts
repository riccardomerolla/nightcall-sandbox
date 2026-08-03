import { Effect, Schema } from "effect"

import { Portfolio, PortfolioPosition } from "../domain/portfolio"
import { PortfolioRowError } from "../domain/import-errors"

export { PortfolioRowError } from "../domain/import-errors"

const expectedHeader = [
  "isin",
  "name",
  "assetClass",
  "quantity",
  "priceEur",
  "currency"
]

interface CsvRecord {
  readonly startingLine: number
  readonly fields: ReadonlyArray<string>
}

type ParserState = "unquoted" | "quoted" | "afterQuote"
type ConsumedFollowingCharacters = 0 | 1

const rowError = (row: number, reason: string) =>
  PortfolioRowError.make({ row, reason })

const stripByteOrderMark = (source: string) =>
  source.charCodeAt(0) === 0xfeff ? source.slice(1) : source

const normalizeLineEndings = (source: string) => source.replace(/\r\n?/g, "\n")

class CsvRecordParser {
  readonly records: Array<CsvRecord> = []
  private fields: Array<string> = []
  private field = ""
  private state: ParserState = "unquoted"
  private sourceLine = 1
  private recordStartingLine = 1

  parse(
    input: string
  ): Effect.Effect<ReadonlyArray<CsvRecord>, PortfolioRowError> {
    for (let index = 0; index < input.length; index += 1) {
      const result = this.consume(input[index], input[index + 1])
      if (result instanceof PortfolioRowError) {
        return Effect.fail(result)
      }
      index += result
    }

    if (this.state === "quoted") {
      return Effect.fail(
        rowError(this.recordStartingLine, "Unterminated quoted field")
      )
    }

    if (
      this.field.length > 0 ||
      this.fields.length > 0 ||
      this.state === "afterQuote"
    ) {
      this.finishRecord()
    }

    return Effect.succeed(this.records)
  }

  private consume(
    character: string | undefined,
    nextCharacter: string | undefined
  ): ConsumedFollowingCharacters | PortfolioRowError {
    switch (this.state) {
      case "quoted":
        return this.consumeQuoted(character, nextCharacter)
      case "afterQuote":
        return this.consumeAfterQuote(character)
      case "unquoted":
        return this.consumeUnquoted(character)
    }
  }

  private consumeQuoted(
    character: string | undefined,
    nextCharacter: string | undefined
  ): ConsumedFollowingCharacters {
    if (character === '"') {
      if (nextCharacter === '"') {
        this.field += '"'
        return 1
      }
      this.state = "afterQuote"
      return 0
    }

    if (character !== undefined) {
      this.field += character
      if (character === "\n") {
        this.sourceLine += 1
      }
    }
    return 0
  }

  private consumeAfterQuote(
    character: string | undefined
  ): ConsumedFollowingCharacters | PortfolioRowError {
    if (character === ",") {
      this.finishField()
      this.state = "unquoted"
      return 0
    }

    if (character === "\n") {
      this.finishRecord()
      this.finishSourceLine()
      this.state = "unquoted"
      return 0
    }

    return rowError(
      this.recordStartingLine,
      "Unexpected character after a closing quote"
    )
  }

  private consumeUnquoted(
    character: string | undefined
  ): ConsumedFollowingCharacters | PortfolioRowError {
    if (character === '"') {
      if (this.field.length > 0) {
        return rowError(
          this.recordStartingLine,
          "Unexpected quote in an unquoted field"
        )
      }
      this.state = "quoted"
    } else if (character === ",") {
      this.finishField()
    } else if (character === "\n") {
      this.finishRecord()
      this.finishSourceLine()
    } else if (character !== undefined) {
      this.field += character
    }
    return 0
  }

  private finishField() {
    this.fields.push(this.field)
    this.field = ""
  }

  private finishRecord() {
    this.finishField()
    this.records.push({
      startingLine: this.recordStartingLine,
      fields: this.fields
    })
    this.fields = []
  }

  private finishSourceLine() {
    this.sourceLine += 1
    this.recordStartingLine = this.sourceLine
  }
}

const parseCsv = (source: string) =>
  new CsvRecordParser().parse(
    normalizeLineEndings(stripByteOrderMark(source))
  )

const sameHeader = (fields: ReadonlyArray<string>) =>
  fields.length === expectedHeader.length &&
  fields.every((field, index) => field.trim() === expectedHeader[index])

const isBlankRecord = (record: CsvRecord) =>
  record.fields.length === 1 && record.fields[0]?.trim() === ""

const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

const parseDecimal = (value: string) => {
  const trimmed = value.trim()
  return decimalPattern.test(trimmed) ? Number(trimmed) : Number.NaN
}

const decodePosition = (record: CsvRecord) => {
  if (record.fields.length !== expectedHeader.length) {
    return Effect.fail(
      rowError(
        record.startingLine,
        `Expected ${expectedHeader.length} columns, received ${record.fields.length}`
      )
    )
  }

  const [
    rawIsin = "",
    rawName = "",
    rawAssetClass = "",
    rawQuantity = "",
    rawPriceEur = "",
    rawCurrency = ""
  ] = record.fields

  const quantity = parseDecimal(rawQuantity)
  const priceEur = parseDecimal(rawPriceEur)

  return Schema.decodeUnknownEffect(PortfolioPosition)({
    isin: rawIsin.trim(),
    name: rawName.trim(),
    assetClass: rawAssetClass.trim(),
    quantity,
    priceEur,
    currency: rawCurrency.trim()
  }).pipe(
    Effect.mapError((error) => rowError(record.startingLine, error.message))
  )
}

export const importPortfolioCsv = Effect.fn("importPortfolioCsv")(function* (
  source: string
) {
  const records = yield* parseCsv(source)
  const [header, ...unfilteredDataRecords] = records

  if (header === undefined) {
    return yield* Effect.fail(rowError(1, "CSV is empty"))
  }

  if (!sameHeader(header.fields)) {
    return yield* Effect.fail(
      rowError(
        header.startingLine,
        `Expected header ${expectedHeader.join(",")}`
      )
    )
  }

  const dataRecords = unfilteredDataRecords.filter(
    (record) => !isBlankRecord(record)
  )

  if (dataRecords.length === 0) {
    return yield* Effect.fail(
      rowError(header.startingLine + 1, "Portfolio has no positions")
    )
  }

  const positions = yield* Effect.forEach(dataRecords, decodePosition)

  return yield* Schema.decodeUnknownEffect(Portfolio)({ positions }).pipe(
    Effect.mapError((error) =>
      rowError(header.startingLine + 1, error.message)
    )
  )
})
