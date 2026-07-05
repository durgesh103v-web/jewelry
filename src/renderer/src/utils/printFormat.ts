export function formatDate(date?: string): string {
  if (!date) return ''

  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return date

  return `${day}-${month}-${year}`
}

export function formatAmount(value?: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatWeight(value?: number): string {
  return Number(value || 0).toFixed(3)
}

export function formatQty(value?: number): string {
  return Number(value || 0).toFixed(0)
}
