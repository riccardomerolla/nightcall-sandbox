// Tiny string-case utilities. Zero dependencies; tests run with node:test.

/** Split an input into lowercase words on spaces, underscores, hyphens,
 * and camelCase boundaries. */
export const words = (input) =>
  String(input)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.toLowerCase())

/** camelCase: first word lowercase, subsequent words capitalized. */
export const camelCase = (input) => {
  const parts = words(input)
  return parts
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("")
}

/** kebab-case: words joined with hyphens. */
export const kebabCase = (input) => words(input).join("-")
