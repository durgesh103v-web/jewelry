export type CashBookReportFilter = {
  fromDate?: string
  toDate?: string
}

export type CashBookReportRow = {
  id: string
  voucherDate: string
  voucherNo: string
  voucherType: 'RECEIPT' | 'PAYMENT'
  sourceType: string
  sourceLabel: string
  accountName: string
  narration: string
  receiptAmount: number
  paymentAmount: number
  runningBalance: number
}

export type CashBookReportSummary = {
  openingBalance: number
  totalReceipt: number
  totalPayment: number
  closingBalance: number
}

export type CashBookReportResult = {
  rows: CashBookReportRow[]
  summary: CashBookReportSummary
}
