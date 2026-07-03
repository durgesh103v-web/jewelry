export type LabourRateType = 'Kg' | 'Gm' | 'Pcs'

export function roundNumber(value: number, decimals = 3): number {
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function calculateLessWeight(packWeight: number, pcs: number): number {
  return roundNumber(packWeight * pcs)
}

export function calculateNetWeight(grossWeight: number, lessWeight: number, addWeight = 0): number {
  return roundNumber(grossWeight - lessWeight + addWeight)
}

export function calculateHishob(tunch: number, wastage: number): number {
  return roundNumber(tunch + wastage)
}

export function calculateFineFromHishob(netWeight: number, hishob: number): number {
  return roundNumber((netWeight * hishob) / 100)
}

export function calculateFine(netWeight: number, tunch: number, wastage = 0): number {
  const hishob = calculateHishob(tunch, wastage)
  return calculateFineFromHishob(netWeight, hishob)
}

export function calculateMajuri(params: {
  netWeight: number
  pcs: number
  labourRate: number
  labourRateType: LabourRateType
}): number {
  const { netWeight, pcs, labourRate, labourRateType } = params

  if (labourRateType === 'Kg') {
    return roundNumber((netWeight * labourRate) / 1000, 0)
  }

  if (labourRateType === 'Gm') {
    return roundNumber(netWeight * labourRate, 0)
  }

  if (labourRateType === 'Pcs') {
    return roundNumber(pcs * labourRate, 0)
  }

  return 0
}

export function calculateSaleItemTotals(params: {
  pcs: number
  grossWeight: number
  addWeight?: number
  packWeight: number
  tunch: number
  wastage: number
  labourRate: number
  labourRateType: LabourRateType
}): {
  lessWeight: number
  netWeight: number
  hishob: number
  fine: number
  majuri: number
} {
  const lessWeight = calculateLessWeight(params.packWeight, params.pcs)
  const netWeight = calculateNetWeight(params.grossWeight, lessWeight, params.addWeight ?? 0)
  const hishob = calculateHishob(params.tunch, params.wastage)
  const fine = calculateFineFromHishob(netWeight, hishob)
  const majuri = calculateMajuri({
    netWeight,
    pcs: params.pcs,
    labourRate: params.labourRate,
    labourRateType: params.labourRateType
  })

  return {
    lessWeight,
    netWeight,
    hishob,
    fine,
    majuri
  }
}
