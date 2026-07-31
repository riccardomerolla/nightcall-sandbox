# Plan: add-kebabcase

## [ ] Implement kebabCase in src/strcase.js
Add and export `kebabCase(input)` in `src/strcase.js`, implemented as `words(input).join("-")`, reusing the existing `words` helper already in the file. No other files touched.

## [ ] Add kebabCase test coverage and verify npm test passes
In `test/strcase.test.js`, add `node:test` cases asserting: `kebabCase("foo bar") === "foo-bar"`, `kebabCase("fooBarBaz") === "foo-bar-baz"`, `kebabCase("foo_bar") === "foo-bar"`, and `kebabCase("") === ""`. Run `npm test` and confirm it passes with no other files modified.