export type BankTransactionsReportFilter = {
  fromDate?: string
  toDate?: string
}

export type BankTransactionsReportRow = {
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

export type BankTransactionsReportSummary = {
  openingBalance: number
  totalReceipt: number
  totalPayment: number
  closingBalance: number
}

export type BankTransactionsReportResult = {
  rows: BankTransactionsReportRow[]
  summary: BankTransactionsReportSummary
}
