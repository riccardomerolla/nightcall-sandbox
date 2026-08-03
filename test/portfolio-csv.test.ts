import { readFileSync } from "node:fs"

import { Effect } from "effect"
import { describe, expect, it } from "vitest"

import { Portfolio } from "../lib/domain/portfolio"
import {
  importPortfolioCsv,
  PortfolioRowError
} from "../lib/importers/portfolio-csv"

const header = "isin,name,assetClass,quantity,priceEur,currency"

const importFailure = (source: string) =>
  Effect.runPromise(Effect.flip(importPortfolioCsv(source)))

const expectRowError = async (
  source: string,
  row: number,
  reason: string
) => {
  const error = await importFailure(source)

  expect(error).toBeInstanceOf(PortfolioRowError)
  expect(error._tag).toBe("PortfolioRowError")
  expect(error.row).toBe(row)
  expect(error.reason).toContain(reason)
}

describe("importPortfolioCsv", () => {
  it("imports every position in the Mario Rossi portfolio fixture", async () => {
    const source = readFileSync("fixtures/portfolio-mario-rossi.csv", "utf8")

    const portfolio = await Effect.runPromise(importPortfolioCsv(source))

    expect(portfolio).toBeInstanceOf(Portfolio)
    expect(portfolio.positions).toMatchObject([
      {
        isin: "IE00B4L5Y983",
        name: "iShares Core MSCI World UCITS ETF",
        assetClass: "equity",
        quantity: 120,
        priceEur: 101.52,
        currency: "EUR"
      },
      {
        isin: "IE00B1FZS798",
        name: "iShares Core Euro Government Bond UCITS ETF",
        assetClass: "government_bond",
        quantity: 300,
        priceEur: 118.3,
        currency: "EUR"
      },
      {
        isin: "LU0908500753",
        name: "Amundi ETF Euro Corporate Bond",
        assetClass: "corporate_bond",
        quantity: 150,
        priceEur: 52.1,
        currency: "EUR"
      },
      {
        isin: "IE00B579F325",
        name: "Invesco Physical Gold ETC",
        assetClass: "commodity",
        quantity: 40,
        priceEur: 190.75,
        currency: "EUR"
      },
      {
        isin: "IT0005433195",
        name: "BTP Italia Nov 2028",
        assetClass: "government_bond",
        quantity: 10000,
        priceEur: 0.9812,
        currency: "EUR"
      },
      {
        isin: "LU1681043599",
        name: "Amundi MSCI Emerging Markets",
        assetClass: "equity",
        quantity: 220,
        priceEur: 4.86,
        currency: "EUR"
      },
      {
        isin: "CASH-EUR",
        name: "Cash account",
        assetClass: "cash",
        quantity: 1,
        priceEur: 15400,
        currency: "EUR"
      }
    ])
  })

  it("skips blank records between positions and at the end", async () => {
    const source = [
      header,
      "",
      "ID-1,First fund,equity,1,10,EUR",
      "   ",
      "ID-2,Second fund,cash,2,20,EUR",
      "",
      ""
    ].join("\n")

    const portfolio = await Effect.runPromise(importPortfolioCsv(source))

    expect(portfolio.positions.map((position) => position.isin)).toEqual([
      "ID-1",
      "ID-2"
    ])
  })

  it("rejects a header followed only by blank records", async () => {
    await expectRowError(`${header}\n\n   \n`, 2, "Portfolio has no positions")
  })

  it.each([
    ["quantity", "0x10", "1"],
    ["quantity", "0b10", "1"],
    ["quantity", "0o10", "1"],
    ["priceEur", "0x10", "1"],
    ["priceEur", "0b10", "1"],
    ["priceEur", "0o10", "1"]
  ])("rejects JavaScript %s syntax %s", async (field, value, fallback) => {
    const quantity = field === "quantity" ? value : fallback
    const priceEur = field === "priceEur" ? value : fallback
    const source = `${header}\nID,Fund,equity,${quantity},${priceEur},EUR`

    await expectRowError(source, 2, field)
  })

  it("reports empty input", async () => {
    await expectRowError("", 1, "CSV is empty")
  })

  it("reports an invalid header", async () => {
    await expectRowError(
      "name,isin,assetClass,quantity,priceEur,currency",
      1,
      "Expected header"
    )
  })

  it("reports a header-only portfolio", async () => {
    await expectRowError(header, 2, "Portfolio has no positions")
  })

  it("reports an incorrect data column count", async () => {
    await expectRowError(
      `${header}\nID,Fund,equity,1,10`,
      2,
      "Expected 6 columns, received 5"
    )
  })

  it.each([
    ["empty ISIN", ",Fund,equity,1,10,EUR", "isin"],
    ["empty name", "ID,,equity,1,10,EUR", "name"],
    ["invalid asset class", "ID,Fund,crypto,1,10,EUR", "assetClass"],
    ["zero quantity", "ID,Fund,equity,0,10,EUR", "quantity"],
    ["negative quantity", "ID,Fund,equity,-1,10,EUR", "quantity"],
    ["negative price", "ID,Fund,equity,1,-0.01,EUR", "priceEur"],
    ["invalid currency", "ID,Fund,equity,1,10,USD", "currency"]
  ])("reports %s as a row error", async (_case, record, reason) => {
    await expectRowError(`${header}\n${record}`, 2, reason)
  })

  it("reports an unexpected quote in an unquoted field", async () => {
    await expectRowError(
      `${header}\nID,Fu"nd,equity,1,10,EUR`,
      2,
      "Unexpected quote in an unquoted field"
    )
  })

  it("reports an unterminated quoted field", async () => {
    await expectRowError(
      `${header}\nID,"Fund,equity,1,10,EUR`,
      2,
      "Unterminated quoted field"
    )
  })

  it("reports an unexpected character after a closing quote", async () => {
    await expectRowError(
      `${header}\nID,"Fund"x,equity,1,10,EUR`,
      2,
      "Unexpected character after a closing quote"
    )
  })

  it("parses CRLF records and escaped quotes", async () => {
    const source = `${header}\r\nID,"Fund ""Quoted""",equity,1,10,EUR\r\n`

    const portfolio = await Effect.runPromise(importPortfolioCsv(source))

    expect(portfolio.positions[0]).toMatchObject({
      isin: "ID",
      name: 'Fund "Quoted"',
      quantity: 1,
      priceEur: 10
    })
  })

  it("uses the logical record starting line after a multiline field", async () => {
    const source = [
      header,
      'ID-1,"Fund line one',
      'Fund line two",equity,1,10,EUR',
      "ID-2,Broken fund,equity,not-a-number,10,EUR"
    ].join("\n")

    await expectRowError(source, 4, "quantity")
  })
})
