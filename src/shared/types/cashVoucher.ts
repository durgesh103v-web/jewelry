export type CashVoucherType = 'RECEIPT' | 'PAYMENT'

export type CashVoucher = {
  id: string
  voucherType: CashVoucherType
  voucherNo: string
  voucherDate: string
  accountId: string
  accountName: string
  amount: number
  narration: string
  createdAt: string
  updatedAt: string
}

export type CashVoucherPayload = {
  voucherType: CashVoucherType
  voucherDate: string
  accountId: string
  amount: number
  narration?: string
}

export type CashVoucherFilter = {
  fromDate?: string
  toDate?: string
  voucherType?: CashVoucherType | 'ALL'
  accountId?: string
}
