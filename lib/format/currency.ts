const eurFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

export const formatEUR = (amountEUR: number): string =>
  eurFormatter.format(amountEUR)
