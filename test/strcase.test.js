import assert from "node:assert/strict"
import { test } from "node:test"
import { camelCase, words } from "../src/strcase.js"

test("words splits on separators and camel boundaries", () => {
  assert.deepEqual(words("foo_bar-baz qux"), ["foo", "bar", "baz", "qux"])
  assert.deepEqual(words("fooBarBaz"), ["foo", "bar", "baz"])
  assert.deepEqual(words(""), [])
})

test("camelCase joins words with capitalization", () => {
  assert.equal(camelCase("foo bar baz"), "fooBarBaz")
  assert.equal(camelCase("foo_bar"), "fooBar")
  assert.equal(camelCase(""), "")
})
