export function roundNumber(value: number, decimals = 3): number {
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function calculateNetWeight(
  grossWeight: number,
  lessWeight: number,
  addWeight: number
): number {
  return roundNumber(grossWeight - lessWeight + addWeight)
}

export function calculateFine(netWeight: number, tanch: number, wastage: number): number {
  return roundNumber((netWeight * (tanch + wastage)) / 100)
}
