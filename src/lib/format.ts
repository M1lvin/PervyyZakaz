const somNumberFormat = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
})

export function formatSom(amount: number): string {
  return `${somNumberFormat.format(amount)}\u00a0сом`
}
