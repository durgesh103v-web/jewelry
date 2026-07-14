export type DarRojmelFilter = {
  fromDate?: string
  toDate?: string
}

export type DarRojmelTransactionType = 'SALE' | 'PURCHASE' | 'SAUDA'

export type DarRojmelRow = {
  id: string
  entryDate: string
  transactionType: DarRojmelTransactionType
  billNo: string
  accountName: string
  metalType: string
  fine: number
  rate: number | null
  amount: number | null
}

export type DarRojmelSummary = {
  totalFine: number
  totalAmount: number
  saudaCount: number
  recordCount: number
}

export type DarRojmelResult = {
  rows: DarRojmelRow[]
  summary: DarRojmelSummary
}
