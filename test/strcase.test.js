import assert from "node:assert/strict"
import { test } from "node:test"
import { camelCase, kebabCase, words } from "../src/strcase.js"

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

test("kebabCase joins words with hyphens", () => {
  assert.equal(kebabCase("foo bar"), "foo-bar")
  assert.equal(kebabCase("fooBarBaz"), "foo-bar-baz")
  assert.equal(kebabCase("foo_bar"), "foo-bar")
  assert.equal(kebabCase("foo"), "foo")
  assert.equal(kebabCase("foo-bar"), "foo-bar")
  assert.equal(kebabCase(""), "")
})

test("kebabCase handles mixed/consecutive and leading/trailing separators", () => {
  assert.equal(kebabCase("foo__bar--baz"), "foo-bar-baz")
  assert.equal(kebabCase("_foo_bar_"), "foo-bar")
  assert.equal(kebabCase("  foo bar  "), "foo-bar")
})

test("kebabCase coerces non-string input", () => {
  assert.equal(kebabCase(123), "123")
})
