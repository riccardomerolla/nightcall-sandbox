# nightcall-sandbox

A deliberately boring string-utility library. This repository is the
sandbox target for the [Nightcall](https://github.com/riccardomerolla/nightcall)
trust bar: issues labeled `factory:ready` are picked up by the Nightcall
daemon, implemented on `factory/issue-N` branches, and delivered as pull
requests.

- Zero dependencies; ES modules.
- Tests: `npm test` (node:test). Every exported function has tests.
- Style: small pure functions in `src/strcase.js`, tests in `test/`.
