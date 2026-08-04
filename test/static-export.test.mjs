import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("the customer proposal link resolves to an exported page", async () => {
  const proposalHtml = await readFile(
    new URL("../out/customer/proposal.html", import.meta.url),
    "utf8"
  )

  assert.match(proposalHtml, /<h1[^>]*>Rebalancing proposal<\/h1>/)
  assert.match(proposalHtml, /Back to customer dashboard/)
})
