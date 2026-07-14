export type PaymentReceiptFilter = {
  fromDate?: string
  toDate?: string
}

export type PaymentReceiptRow = {
  id: string
  entryDate: string
  voucherNo: string
  sourceType: string
  sourceLabel: string
  accountName: string
  metalType: string
  fineJama: number
  fineNave: number
  cashJama: number
  cashNave: number
  bankJama: number
  bankNave: number
  anamatJama: number
  anamatNave: number
  narration: string
}

export type PaymentReceiptSummary = {
  totalFineJama: number
  totalFineNave: number
  totalCashJama: number
  totalCashNave: number
  totalBankJama: number
  totalBankNave: number
  totalAnamatJama: number
  totalAnamatNave: number
  recordCount: number
}

export type PaymentReceiptResult = {
  rows: PaymentReceiptRow[]
  summary: PaymentReceiptSummary
}
