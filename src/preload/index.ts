import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type AccountGroupPayload = {
  groupName: string
  groupType: string
  description: string
  active: boolean
}

type UserPayload = {
  username: string
  password?: string
  fullName: string
  role: 'ADMIN' | 'USER'
  active: boolean
}

type FinancialYearPayload = {
  yearLabel: string
  startDate: string
  endDate: string
  narration?: string
}

type FinancialYearRecord = {
  id: string
  yearLabel: string
  startDate: string
  endDate: string
  isCurrent: boolean
  isClosed: boolean
  narration: string
  createdAt: string
  updatedAt: string
}

type UserRecord = {
  id: string
  username: string
  fullName: string
  role: string
  active: boolean
  createdAt: string
  updatedAt: string
}

type ItemGroupPayload = {
  groupName: string
  metalType: string
  description: string
  active: boolean
}

type ItemStampPayload = {
  stampName: string
  metalType: string
  description: string
  active: boolean
}

type ItemDesignPayload = {
  designName: string
  metalType: string
  description: string
  active: boolean
}

type ItemPayload = {
  itemName: string
  metalType: string
  itemGroupId: string
  defaultStampId: string
  defaultDesignId: string
  barcodeItem: boolean
  barcodeType: string
  labourChargesBy: string
  salePurchaseBy: string
  gstHsnCode: string
  fixedWeightPerPcs: number
  defaultTanch: number
  defaultWastage: number
  defaultLabourRate: number
  labourRateType: string
  active: boolean
}

type ItemOpeningStockPayload = {
  stockDate: string
  itemId: string
  stampId: string
  designId: string
  barcode: string
  remark: string
  pcs: number
  grossWeight: number
  lessWeight: number
  addWeight: number
  tanch: number
  wastage: number
  hishob: number
  unit: 'Kg' | 'Gm' | 'Pcs'
  majuriRate: number
  active: boolean
}

type SaleItemLinePayload = {
  lineType: string
  itemId: string
  stampId: string
  designId: string
  barcode: string
  remark: string
  pcs: number
  grossWeight: number
  addWeight: number
  packWeight?: number
  tunch?: number
  wastage?: number
  unit: string
  labourRate?: number
  labourRateType?: 'Kg' | 'Gm' | 'Pcs'
}

type SalePaymentLinePayload = {
  type: string
  jamaNave: 'JAMA' | 'NAVE'
  details: string
  pcs: number
  weight: number
  tunch: number
  wastage: number
  fine: number
  rate: number
  fineAmount: number
  anamat: number
  cash: number
  bank: number
  accountId: string
}

type SalePayload = {
  saleDate: string
  accountId: string
  phone: string
  metalType: 'Gold' | 'Silver' | 'Diamond' | 'Other'
  haste: string
  dpNo: string
  narration: string
  reminderDate: string
  itemLines: SaleItemLinePayload[]
  paymentLines: SalePaymentLinePayload[]
}

type ApprovalItemLinePayload = {
  itemId: string
  stampId: string
  designId: string
  barcode: string
  remark: string
  pcs: number
  grossWeight: number
  addWeight: number
  packWeight?: number
  tunch?: number
  wastage?: number
  unit: string
  labourRate?: number
  labourRateType?: 'Kg' | 'Gm' | 'Pcs'
}

type ApprovalPayload = {
  approvalDate: string
  accountId: string
  phone: string
  metalType: 'Gold' | 'Silver' | 'Diamond' | 'Other'
  narration: string
  reminderDate: string
  itemLines: ApprovalItemLinePayload[]
}

type ApprovalStatus = 'pending' | 'approved' | 'returned' | 'partial_return'

type SavedApprovalHeader = {
  id: string
  approval_no: string
  approval_date: string
  account_id: string
  account_name: string
  mobile_number: string
  metal_type: string
  narration: string
  reminder_date: string
  item_fine_total: number
  item_majuri_total: number
  status: ApprovalStatus
  converted_sale_id: string | null
  converted_at: string | null
  returned_at: string | null
}

type SavedApprovalItemLine = {
  id: string
  line_no: number
  item_id: string
  item_name_snapshot: string
  barcode: string
  remark: string
  pcs: number
  gross_weight: number
  pack_weight: number
  less_weight: number
  net_weight: number
  tunch: number
  wastage: number
  hishob: number
  fine: number
  labour_rate: number
  labour_rate_type: string
  majuri: number
  return_status: 'pending' | 'returned'
}

type SavedApprovalRecord = {
  header: SavedApprovalHeader
  itemLines: SavedApprovalItemLine[]
}

type ApprovalRegisterRecord = {
  id: string
  approval_no: string
  approval_date: string
  metal_type: string
  item_fine_total: number
  item_majuri_total: number
  status: ApprovalStatus
  converted_sale_id: string | null
  account_name: string
  mobile_number: string
}

type ReturnApprovalPayload = {
  lineIds: string[]
  returnAll: boolean
  narration: string
}

type ConvertApprovalResult = {
  approval: SavedApprovalRecord
  sale: SavedSaleRecord
}

type EstimateItemLinePayload = {
  itemId: string
  stampId: string
  designId: string
  barcode: string
  remark: string
  pcs: number
  grossWeight: number
  addWeight: number
  packWeight?: number
  tunch?: number
  wastage?: number
  labourRate?: number
  labourRateType?: 'Kg' | 'Gm' | 'Pcs'
  hsnCode: string
  gstRate: number
  taxableAmount: number
}

type EstimatePayload = {
  estimateDate: string
  accountId: string
  phone: string
  metalType: 'Gold' | 'Silver' | 'Diamond' | 'Other'
  narration: string
  validUntil: string
  itemLines: EstimateItemLinePayload[]
}

type EstimateStatus = 'OPEN' | 'CONVERTED' | 'CANCELLED'

type SavedEstimateHeader = {
  id: string
  estimate_no: string
  estimate_date: string
  account_id: string
  account_name: string
  mobile_number: string
  metal_type: string
  narration: string
  valid_until: string
  item_fine_total: number
  item_majuri_total: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  status: EstimateStatus
}

type SavedEstimateItemLine = {
  id: string
  line_no: number
  item_id: string
  item_name_snapshot: string
  barcode: string
  remark: string
  pcs: number
  gross_weight: number
  net_weight: number
  tunch: number
  wastage: number
  fine: number
  majuri: number
  hsn_code: string
  gst_rate: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
}

type SavedEstimateRecord = {
  header: SavedEstimateHeader
  itemLines: SavedEstimateItemLine[]
}

type EstimateRegisterRecord = {
  id: string
  estimate_no: string
  estimate_date: string
  metal_type: string
  item_fine_total: number
  item_majuri_total: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  status: EstimateStatus
  account_name: string
  mobile_number: string
}

type ConvertEstimateResult = {
  estimate: SavedEstimateRecord
  sale: SavedSaleRecord
}

type PurchaseItemLinePayload = {
  itemId: string
  stampId?: string
  designId?: string
  barcode?: string
  remark?: string
  pcs: number
  grossWeight: number
  packWeight?: number
  addWeight: number
  tunch?: number
  wastage?: number
  unit?: string
  labourRate?: number
  labourRateType?: 'Kg' | 'Gm' | 'Pcs'
}

type PurchasePaymentLinePayload = {
  type: string
  details?: string
  pcs?: number
  weight: number
  tanch: number
  wastage: number
  rate?: number
  fineAmount?: number
  anamat: number
  cash: number
  bank: number
  accountId?: string
}

type PurchasePayload = {
  purchaseNo?: string
  purchaseDate: string
  accountId: string
  phone?: string
  metalType: 'Gold' | 'Silver' | 'Diamond' | 'Other'
  haste?: string
  dpNo?: string
  narration?: string
  reminderDate?: string
  itemLines: PurchaseItemLinePayload[]
  paymentLines: PurchasePaymentLinePayload[]
}

type SavedPurchaseHeader = {
  id: string
  purchase_no: string
  purchase_date: string
  account_name: string
  mobile_number: string
  metal_type: string
  old_gold_fine: number
  old_silver_fine: number
  old_cash: number
  old_anamat: number
  old_bank: number
  item_fine_total: number
  item_majuri_total: number
  payment_fine_nave_total: number
  payment_cash_nave_total: number
  payment_bank_nave_total: number
  payment_anamat_nave_total: number
  closing_gold_fine: number
  closing_silver_fine: number
  closing_cash: number
  closing_anamat: number
  closing_bank: number
  narration: string
}

type SavedPurchaseItemLine = {
  line_no: number
  item_name_snapshot: string
  pcs: number
  gross_weight: number
  pack_weight: number
  less_weight: number
  net_weight: number
  tunch: number
  wastage: number
  hishob: number
  fine: number
  labour_rate: number
  labour_rate_type: string
  majuri: number
}

type SavedPurchasePaymentLine = {
  line_no: number
  type: string
  weight: number
  tanch: number
  wastage: number
  hishob: number
  fine: number
  cash: number
  bank: number
  anamat: number
  details: string
}

type SavedPurchaseRecord = {
  header: SavedPurchaseHeader
  itemLines: SavedPurchaseItemLine[]
  paymentLines: SavedPurchasePaymentLine[]
}

type PurchaseRegisterRecord = {
  id: string
  purchaseNo: string
  purchaseDate: string
  accountId: string
  accountName: string
  mobileNumber: string
  metalType: string
  itemFineTotal: number
  itemMajuriTotal: number
  paymentFineNaveTotal: number
  paymentCashNaveTotal: number
  closingGoldFine: number
  closingSilverFine: number
  closingCash: number
  createdAt: string
}

type PurchaseReturnItemLinePayload = {
  itemId: string
  stampId?: string
  designId?: string
  barcode?: string
  remark?: string
  pcs: number
  grossWeight: number
  packWeight?: number
  addWeight: number
  tunch?: number
  wastage?: number
  unit?: string
  labourRate?: number
  labourRateType?: 'Kg' | 'Gm' | 'Pcs'
}

type PurchaseReturnPayload = {
  returnNo?: string
  returnDate: string
  accountId: string
  phone?: string
  metalType: 'Gold' | 'Silver' | 'Diamond' | 'Other'
  againstPurchaseId?: string
  narration?: string
  itemLines: PurchaseReturnItemLinePayload[]
}

type SavedPurchaseReturnHeader = {
  id: string
  return_no: string
  return_date: string
  account_id: string
  account_name: string
  mobile_number: string
  metal_type: string
  against_purchase_id: string | null
  against_purchase_no: string | null
  narration: string
  old_gold_fine: number
  old_silver_fine: number
  old_cash: number
  old_anamat: number
  old_bank: number
  item_fine_total: number
  item_majuri_total: number
  closing_gold_fine: number
  closing_silver_fine: number
  closing_cash: number
  closing_anamat: number
  closing_bank: number
}

type SavedPurchaseReturnItemLine = {
  id: string
  line_no: number
  item_id: string
  item_name_snapshot: string
  barcode: string
  remark: string
  pcs: number
  gross_weight: number
  pack_weight: number
  less_weight: number
  add_weight: number
  net_weight: number
  tunch: number
  wastage: number
  hishob: number
  fine: number
  labour_rate: number
  labour_rate_type: string
  majuri: number
}

type SavedPurchaseReturnRecord = {
  header: SavedPurchaseReturnHeader
  itemLines: SavedPurchaseReturnItemLine[]
}

type PurchaseReturnRegisterRecord = {
  id: string
  returnNo: string
  returnDate: string
  accountId: string
  accountName: string
  mobileNumber: string
  metalType: string
  againstPurchaseId: string | null
  againstPurchaseNo: string | null
  itemFineTotal: number
  itemMajuriTotal: number
  closingGoldFine: number
  closingSilverFine: number
  closingCash: number
  narration: string
  createdAt: string
}

type SaleReturnItemLinePayload = {
  itemId: string
  stampId?: string
  designId?: string
  barcode?: string
  remark?: string
  pcs: number
  grossWeight: number
  packWeight?: number
  addWeight: number
  tunch?: number
  wastage?: number
  unit?: string
  labourRate?: number
  labourRateType?: 'Kg' | 'Gm' | 'Pcs'
}

type SaleReturnPayload = {
  returnNo?: string
  returnDate: string
  accountId: string
  phone?: string
  metalType: 'Gold' | 'Silver' | 'Diamond' | 'Other'
  againstSaleId?: string
  narration?: string
  itemLines: SaleReturnItemLinePayload[]
}

type SavedSaleReturnHeader = {
  id: string
  return_no: string
  return_date: string
  account_id: string
  account_name: string
  mobile_number: string
  metal_type: string
  against_sale_id: string | null
  against_sale_no: string | null
  narration: string
  old_gold_fine: number
  old_silver_fine: number
  old_cash: number
  old_anamat: number
  old_bank: number
  item_fine_total: number
  item_majuri_total: number
  closing_gold_fine: number
  closing_silver_fine: number
  closing_cash: number
  closing_anamat: number
  closing_bank: number
}

type SavedSaleReturnItemLine = {
  id: string
  line_no: number
  item_id: string
  item_name_snapshot: string
  barcode: string
  remark: string
  pcs: number
  gross_weight: number
  pack_weight: number
  less_weight: number
  add_weight: number
  net_weight: number
  tunch: number
  wastage: number
  hishob: number
  fine: number
  labour_rate: number
  labour_rate_type: string
  majuri: number
}

type SavedSaleReturnRecord = {
  header: SavedSaleReturnHeader
  itemLines: SavedSaleReturnItemLine[]
}

type SaleReturnRegisterRecord = {
  id: string
  returnNo: string
  returnDate: string
  accountId: string
  accountName: string
  mobileNumber: string
  metalType: string
  againstSaleId: string | null
  againstSaleNo: string | null
  itemFineTotal: number
  itemMajuriTotal: number
  closingGoldFine: number
  closingSilverFine: number
  closingCash: number
  narration: string
  createdAt: string
}

type CashVoucherType = 'RECEIPT' | 'PAYMENT'

type CashVoucherPayload = {
  voucherType: CashVoucherType
  voucherDate: string
  accountId: string
  amount: number
  narration: string
}

type CashVoucherFilter = {
  fromDate?: string
  toDate?: string
  voucherType?: CashVoucherType | 'ALL'
  accountId?: string
}

type CashVoucherRecord = {
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

type TransferPayload = {
  transferDate: string
  fromAccountId: string
  toAccountId: string
  metalType?: string
  goldFine?: number
  silverFine?: number
  cash?: number
  bank?: number
  anamat?: number
  narration?: string
}

type TransferRecord = {
  id: string
  transferNo: string
  transferDate: string
  fromAccountId?: string
  fromAccountName: string
  toAccountId?: string
  toAccountName: string
  metalType: string
  goldFine: number
  silverFine: number
  cash: number
  bank: number
  anamat: number
  narration: string
  createdAt: string
}

type WeightScanPayload = {
  scanDate: string
  barcode?: string
  itemId?: string
  grossWeight?: number
  netWeight?: number
  fine?: number
  narration?: string
}

type WeightScanRecord = {
  id: string
  scanDate: string
  barcode: string
  itemId: string
  itemName: string
  grossWeight: number
  netWeight: number
  fine: number
  narration: string
  createdAt: string
}

type SaudaPayload = {
  saudaDate: string
  accountId: string
  metalType: string
  transactionType: string
  fine: number
  rate: number
  deliveryDate?: string
  narration?: string
}

type SaudaRecord = {
  id: string
  saudaNo: string
  saudaDate: string
  accountId: string
  accountName: string
  metalType: string
  transactionType: string
  fine: number
  rate: number
  amount: number
  deliveryDate: string
  status: string
  narration: string
  createdAt: string
  updatedAt: string
}

type OrderPayalPayload = {
  orderDate: string
  accountId: string
  itemId: string
  pcs?: number
  weight?: number
  deliveryDate?: string
  narration?: string
}

type OrderPayalRecord = {
  id: string
  orderNo: string
  orderDate: string
  accountId: string
  accountName: string
  itemId: string
  itemName: string
  pcs: number
  weight: number
  deliveryDate: string
  status: string
  narration: string
  createdAt: string
  updatedAt: string
}

type SettlementPayload = {
  settlementDate: string
  accountId: string
  metalType: string
  goldFine?: number
  silverFine?: number
  cash?: number
  bank?: number
  anamat?: number
  narration?: string
}

type SettlementRecord = {
  id: string
  settlementNo: string
  settlementDate: string
  accountId: string
  accountName: string
  metalType: string
  goldFine: number
  silverFine: number
  cash: number
  bank: number
  anamat: number
  narration: string
  createdAt: string
  updatedAt: string
}

type CashFineOpeningLinePayload = {
  metalType: 'Gold' | 'Silver'
  entryType: string
  details: string
  weight: number
  tanch: number
  ptStatus: string
}

type CashFineOpeningSummaryPayload = {
  goldPurchaseFine: number
  goldPurchaseAmount: number
  goldSaleFine: number
  goldSaleAmount: number
  silverPurchaseFine: number
  silverPurchaseAmount: number
  silverSaleFine: number
  silverSaleAmount: number
  openingCash: number
}

type CashFineOpeningRecord = {
  summary: CashFineOpeningSummaryPayload
  lines: Array<
    CashFineOpeningLinePayload & {
      id: string
      lineNo: number
      fine: number
      createdAt: string
      updatedAt: string
    }
  >
}

type CashFineOpeningPayload = {
  lines: CashFineOpeningLinePayload[]
  summary: CashFineOpeningSummaryPayload
}
type AccountBalanceRecord = {
  goldFine: number
  silverFine: number
  cash: number
  anamat: number
  bank: number
}

type SavedSaleHeader = {
  id: string
  sale_no: string
  sale_date: string
  account_name: string
  mobile_number: string
  metal_type: string
  old_gold_fine: number
  old_silver_fine: number
  old_cash: number
  old_anamat: number
  old_bank: number
  item_fine_total: number
  item_majuri_total: number
  payment_fine_jama_total: number
  payment_cash_jama_total: number
  payment_bank_jama_total: number
  payment_anamat_jama_total: number
  closing_gold_fine: number
  closing_silver_fine: number
  closing_cash: number
  closing_anamat: number
  closing_bank: number
  narration: string
}

type SavedSaleItemLine = {
  line_no: number
  item_name_snapshot: string
  pcs: number
  gross_weight: number
  pack_weight: number
  less_weight: number
  net_weight: number
  tunch: number
  wastage: number
  hishob: number
  fine: number
  labour_rate: number
  labour_rate_type: string
  majuri: number
}

type SavedSalePaymentLine = {
  line_no: number
  type: string
  weight: number
  tanch: number
  wastage: number
  hishob: number
  fine: number
  cash: number
  bank: number
  anamat: number
  details: string
}

type SavedSaleRecord = {
  header: SavedSaleHeader
  itemLines: SavedSaleItemLine[]
  paymentLines: SavedSalePaymentLine[]
}

type SaleRegisterRecord = {
  id: string
  sale_no: string
  sale_date: string
  accountId: string
  metal_type: string
  item_fine_total: number
  item_majuri_total: number
  payment_fine_jama_total: number
  payment_cash_jama_total: number
  closing_gold_fine: number
  closing_silver_fine: number
  closing_cash: number
  account_name: string
  mobile_number: string
}

type SaleDeleteListRecord = {
  id: string
  sale_no: string
  sale_date: string
  accountId: string
  metal_type: string
  item_fine_total: number
  item_majuri_total: number
  closing_gold_fine: number
  closing_silver_fine: number
  closing_cash: number
  narration: string
  voided_at: string | null
  void_reason: string
  status: 'ACTIVE' | 'VOIDED'
  account_name: string
  mobile_number: string
}

type ReminderRecord = {
  id: string
  type: 'Sale' | 'Approval'
  billNo: string
  billDate: string
  reminderDate: string
  accountName: string
  mobileNumber: string
  metalType: string
  fineAmount: number
  majuriAmount: number
  daysUntil: number
  isOverdue: boolean
}

type WhatsAppSendPayload = {
  phone: string
  message: string
}

type WhatsAppSendResult = {
  success: boolean
  url: string
}

type ScreenshotCaptureResult = {
  filePath: string
  fileName: string
  capturedAt: string
}

type ScreenshotListRecord = {
  fileName: string
  filePath: string
  capturedAt: string
}

type AccountBalanceReportRecord = {
  id: string
  accountName: string
  otherName: string
  mobileNumber: string
  city: string
  groupName: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  goldFine: number
  silverFine: number
  cash: number
  anamat: number
  bank: number
}

type AccountLedgerDetailsRecord = {
  account: {
    id: string
    accountName: string
    otherName: string
    mobileNumber: string
    city: string
    groupName: string
  }
  openingBalance: {
    goldFine: number
    silverFine: number
    cash: number
    anamat: number
    bank: number
  }
  periodOpeningBalance: {
    goldFine: number
    silverFine: number
    cash: number
    anamat: number
    bank: number
  }
  rows: Array<{
    id: string
    srNo: number
    sourceType: string
    sourceId: string
    saleNo: string
    billNo: string
    entryDate: string
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
    runningGoldFine: number
    runningSilverFine: number
    runningCash: number
    runningBank: number
    runningAnamat: number
  }>
  closingBalance: {
    goldFine: number
    silverFine: number
    cash: number
    anamat: number
    bank: number
  }
}

type AccountLedgerDetailsFilter = {
  fromDate?: string
  toDate?: string
}

type OutstandingReportRecord = AccountBalanceReportRecord & {
  status: 'RECEIVABLE' | 'PAYABLE'
  sortValue: number
  lastTransactionDate: string | null
  daysSinceLastTransaction: number | null
}

type OutstandingReportTotals = {
  goldFine: number
  silverFine: number
  cash: number
  anamat: number
  bank: number
}

type OutstandingReportResult = {
  receivable: OutstandingReportRecord[]
  payable: OutstandingReportRecord[]
  receivableTotals: OutstandingReportTotals
  payableTotals: OutstandingReportTotals
}

type ItemStockReportRecord = {
  itemId: string
  itemName: string
  metalType: string
  groupName: string
  stampId: string
  stampName: string
  designId: string
  designName: string
  pcs: number
  grossWeight: number
  netWeight: number
  fine: number
}

type ItemTransactionReportRecord = {
  id: string
  sourceType: string
  sourceId: string
  entryDate: string
  metalType: string
  pcsDelta: number
  grossWeightDelta: number
  netWeightDelta: number
  fineDelta: number
  narration: string
  createdAt: string
  itemId: string
  itemName: string
  groupName: string
  stampName: string
  designName: string
  saleNo: string
}

type ItemStockLedgerFilter = {
  fromDate?: string
  toDate?: string
}

type ItemStockLedgerResult = {
  item: {
    id: string
    itemName: string
    metalType: string
    groupName: string
  }
  openingBalance: {
    pcs: number
    grossWeight: number
    netWeight: number
    fine: number
  }
  rows: Array<{
    id: string
    srNo: number
    sourceType: string
    sourceId: string
    billNo: string
    entryDate: string
    metalType: string
    stampName: string
    designName: string
    pcsDelta: number
    grossWeightDelta: number
    netWeightDelta: number
    fineDelta: number
    narration: string
    runningPcs: number
    runningGrossWeight: number
    runningNetWeight: number
    runningFine: number
  }>
  closingBalance: {
    pcs: number
    grossWeight: number
    netWeight: number
    fine: number
  }
}

type CashBookReportFilter = {
  fromDate?: string
  toDate?: string
}

type CashBookReportRow = {
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

type CashBookReportSummary = {
  openingBalance: number
  totalReceipt: number
  totalPayment: number
  closingBalance: number
}

type CashBookReportResult = {
  rows: CashBookReportRow[]
  summary: CashBookReportSummary
}

type BankTransactionsReportFilter = {
  fromDate?: string
  toDate?: string
}

type BankTransactionsReportRow = {
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

type BankTransactionsReportSummary = {
  openingBalance: number
  totalReceipt: number
  totalPayment: number
  closingBalance: number
}

type BankTransactionsReportResult = {
  rows: BankTransactionsReportRow[]
  summary: BankTransactionsReportSummary
}
type AccountWiseSalePurchaseRecord = {
  id: string
  transactionType: 'SALE' | 'PURCHASE'
  billNo: string
  billDate: string
  accountId: string
  accountName: string
  mobileNumber: string
  city: string
  groupName: string
  metalType: string
  fineJama: number
  fineNave: number
  paymentFineJama: number
  paymentFineNave: number
  cashJama: number
  cashNave: number
  paymentCashJama: number
  paymentCashNave: number
  bankJama: number
  bankNave: number
  anamatJama: number
  anamatNave: number
  closingGoldFine: number
  closingSilverFine: number
  closingCash: number
  createdAt: string
}

type DarRojmelFilter = {
  fromDate?: string
  toDate?: string
}

type DarRojmelRow = {
  id: string
  entryDate: string
  transactionType: 'SALE' | 'PURCHASE' | 'SAUDA'
  billNo: string
  accountName: string
  metalType: string
  fine: number
  rate: number | null
  amount: number | null
}

type DarRojmelSummary = {
  totalFine: number
  totalAmount: number
  saudaCount: number
  recordCount: number
}

type DarRojmelResult = {
  rows: DarRojmelRow[]
  summary: DarRojmelSummary
}

type AccountwiseSummaryRecord = {
  id: string
  accountName: string
  otherName: string
  mobileNumber: string
  city: string
  groupName: string
  totalSaleFine: number
  totalSaleValue: number
  totalPurchaseFine: number
  totalPurchaseValue: number
  goldFine: number
  silverFine: number
  cash: number
  anamat: number
  bank: number
}

type ItemwiseSalePurchaseRecord = {
  itemId: string
  itemName: string
  groupName: string
  metalType: string
  salePcs: number
  saleNetWeight: number
  saleFine: number
  purchasePcs: number
  purchaseNetWeight: number
  purchaseFine: number
}

type ItemSalePurchaseCityWiseRecord = {
  itemId: string
  itemName: string
  groupName: string
  metalType: string
  city: string
  salePcs: number
  saleNetWeight: number
  saleFine: number
  purchasePcs: number
  purchaseNetWeight: number
  purchaseFine: number
}

type PaymentReceiptFilter = {
  fromDate?: string
  toDate?: string
}

type PaymentReceiptRow = {
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

type PaymentReceiptSummary = {
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

type PaymentReceiptResult = {
  rows: PaymentReceiptRow[]
  summary: PaymentReceiptSummary
}

type GstReportFilter = {
  fromDate?: string
  toDate?: string
}

type GstReportRow = {
  id: string
  billNo: string
  billDate: string
  accountId: string
  accountName: string
  gstNo: string
  metalType: string
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalTax: number
  totalAmount: number
  createdAt: string
}

type FineReportFilter = {
  fromDate?: string
  toDate?: string
}

type FineRojmelRow = {
  id: string
  entryDate: string
  metalType: string
  fineIn: number
  fineOut: number
  balance: number
}

type FineRojmelSummary = {
  openingGoldBalance: number
  totalGoldIn: number
  totalGoldOut: number
  closingGoldBalance: number
  openingSilverBalance: number
  totalSilverIn: number
  totalSilverOut: number
  closingSilverBalance: number
}

type FineRojmelResult = {
  rows: FineRojmelRow[]
  summary: FineRojmelSummary
}

type FineMarginRow = {
  id: string
  billDate: string
  billNo: string
  accountId: string
  accountName: string
  metalType: string
  itemName: string
  pcs: number
  netWeight: number
  tunch: number
  wastage: number
  hishob: number
  fine: number
  majuri: number
  wastageFineValue: number
}

type FineMarginSummary = {
  totalNetWeight: number
  totalFine: number
  totalMajuri: number
  totalWastageFineValue: number
  recordCount: number
}

type FineMarginResult = {
  rows: FineMarginRow[]
  summary: FineMarginSummary
}

type DailySummaryFilter = {
  date?: string
}

type DailySummarySalesSection = {
  count: number
  itemFineTotal: number
  itemMajuriTotal: number
  amountTotal: number
}

type DailySummaryReturnSection = {
  count: number
  itemFineTotal: number
  itemMajuriTotal: number
}

type DailySummaryCashVoucherSection = {
  count: number
  amountTotal: number
}

type DailySummaryApprovalSection = {
  count: number
  itemFineTotal: number
  itemMajuriTotal: number
}

type DailySummaryCashSection = {
  openingBalance: number
  totalReceipt: number
  totalPayment: number
  closingBalance: number
  netMovement: number
}

type DailySummaryFineSection = {
  goldIn: number
  goldOut: number
  goldNet: number
  silverIn: number
  silverOut: number
  silverNet: number
}

type DailySummaryResult = {
  date: string
  sales: DailySummarySalesSection
  purchases: DailySummarySalesSection
  saleReturns: DailySummaryReturnSection
  purchaseReturns: DailySummaryReturnSection
  cashReceipts: DailySummaryCashVoucherSection
  cashPayments: DailySummaryCashVoucherSection
  approvals: DailySummaryApprovalSection
  cash: DailySummaryCashSection
  fine: DailySummaryFineSection
}

type BackupResult = {
  success: boolean
  cancelled: boolean
  fileName?: string
  backupPath?: string
  backupAt?: string
  message: string
}

type LastBackupInfo = {
  backupAt: string
  fileName: string
  backupPath: string
}

type FirmPayload = {
  firmName: string
  ownerName: string
  address: string
  city: string
  state: string
  pincode: string
  mobileNumber: string
  whatsappNumber: string
  email: string
  gstNo: string
  panNo: string
  billTitle: string
  billPrefix: string
  terms: string
  active: boolean
}

type FirmRecord = FirmPayload & {
  id: string
  createdAt: string
  updatedAt: string
}

type PrinterSettingPayload = {
  paperSize: 'A4' | '80MM' | '58MM'
  printLayout: 'STANDARD' | 'COMPACT'
  printCopies: number
  marginTopMm: number
  marginRightMm: number
  marginBottomMm: number
  marginLeftMm: number
  showFirmHeader: boolean
  showGstPan: boolean
  showTerms: boolean
  showSignature: boolean
  showPaymentSection: boolean
  autoPrintAfterSave: boolean
}

type PrinterSettingRecord = PrinterSettingPayload & {
  id: string
  createdAt: string
  updatedAt: string
}
type AccountPayload = {
  accountName: string
  otherName: string
  accountType: string
  accountGroupId: string
  mobileNumber: string
  whatsappNumber: string
  phone2: string
  address: string
  city: string
  state: string
  gstNo: string
  panNo: string
  lastDate: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  goldFineLimit: number
  silverFineLimit: number
  notification: string
  active: boolean
}

type JobWorkOrderPayload = {
  orderNo?: string
  orderDate: string
  karigarAccountId: string
  metalType: 'Gold' | 'Silver' | 'Diamond' | 'Other'
  itemId: string
  grossWeightGiven: number
  netWeightGiven: number
  narration?: string
}

type JobWorkStatus = 'pending' | 'partial_received' | 'received' | 'cancelled'

type JobWorkReceiptPayload = {
  receiptDate: string
  pcs: number
  grossWeightReceived: number
  netWeightReceived: number
  tunch: number
  wastage: number
  labourRate: number
  labourRateType: 'Kg' | 'Gm' | 'Pcs'
  narration?: string
}

type SavedJobWorkHeader = {
  id: string
  order_no: string
  order_date: string
  karigar_account_id: string
  karigar_name: string
  karigar_mobile: string
  metal_type: string
  item_id: string
  item_name: string
  gross_weight_given: number
  net_weight_given: number
  narration: string
  status: JobWorkStatus
  total_net_weight_received: number
  total_fine_received: number
  total_majuri: number
}

type SavedJobWorkReceiptLine = {
  id: string
  job_work_order_id: string
  receipt_date: string
  pcs: number
  gross_weight_received: number
  net_weight_received: number
  tunch: number
  wastage: number
  hishob: number
  fine_received: number
  weight_loss: number
  labour_rate: number
  labour_rate_type: string
  majuri: number
  narration: string
}

type SavedJobWorkRecord = {
  header: SavedJobWorkHeader
  receiptLines: SavedJobWorkReceiptLine[]
}

type RepairEntryPayload = {
  repairNo?: string
  receiptDate: string
  accountId: string
  phone?: string
  itemDescription: string
  metalType: 'Gold' | 'Silver' | 'Diamond' | 'Other'
  approxWeight: number
  workDescription?: string
  estimatedCharge: number
  narration?: string
}

type RepairEntryStatus = 'received' | 'completed' | 'delivered' | 'cancelled'

type CompleteRepairPayload = {
  actualCharge: number
  completedDate?: string
  narration?: string
}

type MarkDeliveredPayload = {
  deliveredDate?: string
}

type RepairEntryRecord = {
  id: string
  repair_no: string
  receipt_date: string
  account_id: string
  account_name: string
  mobile_number: string
  phone: string
  item_description: string
  metal_type: string
  approx_weight: number
  work_description: string
  estimated_charge: number
  actual_charge: number | null
  status: RepairEntryStatus
  completed_date: string | null
  delivered_date: string | null
  narration: string
}

type JobWorkRegisterRecord = {
  id: string
  order_no: string
  order_date: string
  metal_type: string
  gross_weight_given: number
  net_weight_given: number
  status: JobWorkStatus
  narration: string
  karigar_name: string
  karigar_mobile: string
  item_name: string
  total_net_weight_received: number
  total_fine_received: number
  total_majuri: number
}

const api = {
  accountGroups: {
    list: () => ipcRenderer.invoke('account-groups:list'),

    create: (payload: AccountGroupPayload) => ipcRenderer.invoke('account-groups:create', payload),

    update: (id: string, payload: AccountGroupPayload) =>
      ipcRenderer.invoke('account-groups:update', id, payload),

    remove: (id: string) => ipcRenderer.invoke('account-groups:delete', id)
  },

  users: {
    list: (): Promise<UserRecord[]> => ipcRenderer.invoke('users:list'),

    create: (payload: UserPayload): Promise<UserRecord> =>
      ipcRenderer.invoke('users:create', payload),

    update: (id: string, payload: UserPayload): Promise<UserRecord> =>
      ipcRenderer.invoke('users:update', id, payload),

    remove: (id: string): Promise<{ success: boolean }> => ipcRenderer.invoke('users:delete', id)
  },

  financialYears: {
    list: (): Promise<FinancialYearRecord[]> => ipcRenderer.invoke('financial-years:list'),

    getCurrent: (): Promise<FinancialYearRecord | null> =>
      ipcRenderer.invoke('financial-years:get-current'),

    create: (payload: FinancialYearPayload): Promise<FinancialYearRecord> =>
      ipcRenderer.invoke('financial-years:create', payload),

    update: (id: string, payload: FinancialYearPayload): Promise<FinancialYearRecord> =>
      ipcRenderer.invoke('financial-years:update', id, payload),

    setCurrent: (id: string): Promise<FinancialYearRecord> =>
      ipcRenderer.invoke('financial-years:set-current', id),

    toggleClosed: (id: string, isClosed: boolean): Promise<FinancialYearRecord> =>
      ipcRenderer.invoke('financial-years:toggle-closed', id, isClosed),

    remove: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('financial-years:delete', id)
  },

  itemGroups: {
    list: () => ipcRenderer.invoke('item-groups:list'),

    create: (payload: ItemGroupPayload) => ipcRenderer.invoke('item-groups:create', payload),

    update: (id: string, payload: ItemGroupPayload) =>
      ipcRenderer.invoke('item-groups:update', id, payload),

    remove: (id: string) => ipcRenderer.invoke('item-groups:delete', id)
  },

  itemStamps: {
    list: () => ipcRenderer.invoke('item-stamps:list'),

    create: (payload: ItemStampPayload) => ipcRenderer.invoke('item-stamps:create', payload),

    update: (id: string, payload: ItemStampPayload) =>
      ipcRenderer.invoke('item-stamps:update', id, payload),

    remove: (id: string) => ipcRenderer.invoke('item-stamps:delete', id)
  },

  itemDesigns: {
    list: () => ipcRenderer.invoke('item-designs:list'),

    create: (payload: ItemDesignPayload) => ipcRenderer.invoke('item-designs:create', payload),

    update: (id: string, payload: ItemDesignPayload) =>
      ipcRenderer.invoke('item-designs:update', id, payload),

    remove: (id: string) => ipcRenderer.invoke('item-designs:delete', id)
  },

  items: {
    list: () => ipcRenderer.invoke('items:list'),

    create: (payload: ItemPayload) => ipcRenderer.invoke('items:create', payload),

    update: (id: string, payload: ItemPayload) => ipcRenderer.invoke('items:update', id, payload),

    remove: (id: string) => ipcRenderer.invoke('items:delete', id),

    assignBarcode: (id: string) => ipcRenderer.invoke('items:assignBarcode', id),

    regenerateBarcode: (id: string) => ipcRenderer.invoke('items:regenerateBarcode', id)
  },

  itemOpeningStock: {
    list: () => ipcRenderer.invoke('item-opening-stock:list'),

    create: (payload: ItemOpeningStockPayload) =>
      ipcRenderer.invoke('item-opening-stock:create', payload),

    update: (id: string, payload: ItemOpeningStockPayload) =>
      ipcRenderer.invoke('item-opening-stock:update', id, payload),

    remove: (id: string) => ipcRenderer.invoke('item-opening-stock:delete', id)
  },

  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),

    create: (payload: AccountPayload) => ipcRenderer.invoke('accounts:create', payload),

    update: (id: string, payload: AccountPayload) =>
      ipcRenderer.invoke('accounts:update', id, payload),

    remove: (id: string) => ipcRenderer.invoke('accounts:delete', id)
  },

  cashVoucher: {
    getNextNumber: (voucherType: CashVoucherType): Promise<string> =>
      ipcRenderer.invoke('cash-vouchers:next-number', voucherType),

    create: (payload: CashVoucherPayload): Promise<CashVoucherRecord> =>
      ipcRenderer.invoke('cash-vouchers:create', payload),

    update: (id: string, payload: CashVoucherPayload): Promise<CashVoucherRecord> =>
      ipcRenderer.invoke('cash-vouchers:update', id, payload),

    remove: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('cash-vouchers:delete', id),

    delete: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('cash-vouchers:delete', id),

    getById: (id: string): Promise<CashVoucherRecord> =>
      ipcRenderer.invoke('cash-vouchers:get-by-id', id),

    list: (filter?: CashVoucherFilter): Promise<CashVoucherRecord[]> =>
      ipcRenderer.invoke('cash-vouchers:list', filter)
  },

  cashFineOpening: {
    get: (): Promise<CashFineOpeningRecord> => ipcRenderer.invoke('cash-fine-opening:get'),
    save: (payload: CashFineOpeningPayload): Promise<CashFineOpeningRecord> =>
      ipcRenderer.invoke('cash-fine-opening:save', payload)
  },
  sales: {
    getNextNumber: () => ipcRenderer.invoke('sales:next-number'),

    getAccountBalance: (accountId: string) =>
      ipcRenderer.invoke('sales:account-balance', accountId),

    create: (payload: SalePayload): Promise<SavedSaleRecord> =>
      ipcRenderer.invoke('sales:create', payload),

    list: (): Promise<SaleRegisterRecord[]> => ipcRenderer.invoke('sales:list'),

    getById: (id: string): Promise<SavedSaleRecord> => ipcRenderer.invoke('sales:get-by-id', id),

    cancel: (id: string, reason?: string): Promise<{ success: boolean; saleNo: string }> =>
      ipcRenderer.invoke('sales:cancel', id, reason),

    listAllForDelete: (): Promise<SaleDeleteListRecord[]> =>
      ipcRenderer.invoke('sales:list-all-for-delete')
  },

  approvals: {
    getNextNumber: (): Promise<string> => ipcRenderer.invoke('approvals:next-number'),

    create: (payload: ApprovalPayload): Promise<SavedApprovalRecord> =>
      ipcRenderer.invoke('approvals:create', payload),

    update: (id: string, payload: ApprovalPayload): Promise<SavedApprovalRecord> =>
      ipcRenderer.invoke('approvals:update', id, payload),

    list: (): Promise<ApprovalRegisterRecord[]> => ipcRenderer.invoke('approvals:list'),

    getById: (id: string): Promise<SavedApprovalRecord> =>
      ipcRenderer.invoke('approvals:get-by-id', id),

    remove: (id: string): Promise<{ success: boolean; approvalNo: string }> =>
      ipcRenderer.invoke('approvals:delete', id),

    convertToSale: (id: string): Promise<ConvertApprovalResult> =>
      ipcRenderer.invoke('approvals:convert-to-sale', id),

    returnApproval: (id: string, payload: ReturnApprovalPayload): Promise<SavedApprovalRecord> =>
      ipcRenderer.invoke('approvals:return', id, payload)
  },

  estimates: {
    getNextNumber: (): Promise<string> => ipcRenderer.invoke('estimates:next-number'),

    create: (payload: EstimatePayload): Promise<SavedEstimateRecord> =>
      ipcRenderer.invoke('estimates:create', payload),

    update: (id: string, payload: EstimatePayload): Promise<SavedEstimateRecord> =>
      ipcRenderer.invoke('estimates:update', id, payload),

    list: (): Promise<EstimateRegisterRecord[]> => ipcRenderer.invoke('estimates:list'),

    getById: (id: string): Promise<SavedEstimateRecord> =>
      ipcRenderer.invoke('estimates:get-by-id', id),

    remove: (id: string): Promise<{ success: boolean; estimateNo: string }> =>
      ipcRenderer.invoke('estimates:delete', id),

    convertToSale: (id: string): Promise<ConvertEstimateResult> =>
      ipcRenderer.invoke('estimates:convert-to-sale', id)
  },

  purchases: {
    getNextNumber: (): Promise<string> => ipcRenderer.invoke('purchases:next-number'),

    getAccountBalance: (accountId: string): Promise<AccountBalanceRecord> =>
      ipcRenderer.invoke('purchases:account-balance', accountId),

    create: (payload: PurchasePayload): Promise<SavedPurchaseRecord> =>
      ipcRenderer.invoke('purchases:create', payload),

    list: (): Promise<PurchaseRegisterRecord[]> => ipcRenderer.invoke('purchases:list'),

    getById: (id: string): Promise<SavedPurchaseRecord> =>
      ipcRenderer.invoke('purchases:get-by-id', id),

    cancel: (id: string): Promise<{ success: boolean; purchaseNo: string }> =>
      ipcRenderer.invoke('purchases:cancel', id)
  },

  purchaseReturns: {
    getNextNumber: (): Promise<string> => ipcRenderer.invoke('purchase-returns:next-number'),

    getAccountBalance: (accountId: string): Promise<AccountBalanceRecord> =>
      ipcRenderer.invoke('purchase-returns:account-balance', accountId),

    create: (payload: PurchaseReturnPayload): Promise<SavedPurchaseReturnRecord> =>
      ipcRenderer.invoke('purchase-returns:create', payload),

    update: (id: string, payload: PurchaseReturnPayload): Promise<SavedPurchaseReturnRecord> =>
      ipcRenderer.invoke('purchase-returns:update', id, payload),

    list: (): Promise<PurchaseReturnRegisterRecord[]> => ipcRenderer.invoke('purchase-returns:list'),

    getById: (id: string): Promise<SavedPurchaseReturnRecord> =>
      ipcRenderer.invoke('purchase-returns:get-by-id', id),

    remove: (id: string): Promise<{ success: boolean; returnNo: string }> =>
      ipcRenderer.invoke('purchase-returns:delete', id)
  },

  saleReturns: {
    getNextNumber: (): Promise<string> => ipcRenderer.invoke('sale-returns:next-number'),

    getAccountBalance: (accountId: string): Promise<AccountBalanceRecord> =>
      ipcRenderer.invoke('sale-returns:account-balance', accountId),

    create: (payload: SaleReturnPayload): Promise<SavedSaleReturnRecord> =>
      ipcRenderer.invoke('sale-returns:create', payload),

    update: (id: string, payload: SaleReturnPayload): Promise<SavedSaleReturnRecord> =>
      ipcRenderer.invoke('sale-returns:update', id, payload),

    list: (): Promise<SaleReturnRegisterRecord[]> => ipcRenderer.invoke('sale-returns:list'),

    getById: (id: string): Promise<SavedSaleReturnRecord> =>
      ipcRenderer.invoke('sale-returns:get-by-id', id),

    remove: (id: string): Promise<{ success: boolean; returnNo: string }> =>
      ipcRenderer.invoke('sale-returns:delete', id)
  },

  cashBookReport: {
    get: (filter?: CashBookReportFilter): Promise<CashBookReportResult> =>
      ipcRenderer.invoke('cashBookReport:get', filter)
  },
  reports: {
    accountBalance: (): Promise<AccountBalanceReportRecord[]> =>
      ipcRenderer.invoke('reports:account-balance'),

    accountLedgerDetails: (
      accountId: string,
      filter?: AccountLedgerDetailsFilter
    ): Promise<AccountLedgerDetailsRecord> =>
      ipcRenderer.invoke('reports:account-ledger-details', accountId, filter),

    outstanding: (): Promise<OutstandingReportResult> => ipcRenderer.invoke('reports:outstanding'),

    itemStock: (): Promise<ItemStockReportRecord[]> => ipcRenderer.invoke('reports:item-stock'),

    itemTransactions: (): Promise<ItemTransactionReportRecord[]> =>
      ipcRenderer.invoke('reports:item-transactions'),

    itemStockLedger: (
      itemId: string,
      filter?: ItemStockLedgerFilter
    ): Promise<ItemStockLedgerResult> =>
      ipcRenderer.invoke('reports:item-stock-ledger', itemId, filter),

    accountWiseSalePurchase: (): Promise<AccountWiseSalePurchaseRecord[]> =>
      ipcRenderer.invoke('reports:account-wise-sale-purchase'),

    cashBook: (filter?: CashBookReportFilter): Promise<CashBookReportResult> =>
      ipcRenderer.invoke('reports:cash-book', filter),

    bankTransactions: (
      filter?: BankTransactionsReportFilter
    ): Promise<BankTransactionsReportResult> =>
      ipcRenderer.invoke('reports:bank-transactions', filter),

    darRojmel: (filter?: DarRojmelFilter): Promise<DarRojmelResult> =>
      ipcRenderer.invoke('reports:dar-rojmel', filter),

    accountwiseSummary: (): Promise<AccountwiseSummaryRecord[]> =>
      ipcRenderer.invoke('reports:accountwise-summary'),

    itemwiseSalePurchase: (): Promise<ItemwiseSalePurchaseRecord[]> =>
      ipcRenderer.invoke('reports:itemwise-sale-purchase'),

    itemSalePurchaseCityWise: (): Promise<ItemSalePurchaseCityWiseRecord[]> =>
      ipcRenderer.invoke('reports:item-sale-purchase-city-wise'),

    paymentReceipt: (filter?: PaymentReceiptFilter): Promise<PaymentReceiptResult> =>
      ipcRenderer.invoke('reports:payment-receipt', filter)
  },

  gstReport: {
    purchases: (filter?: GstReportFilter): Promise<GstReportRow[]> =>
      ipcRenderer.invoke('gstReport:purchases', filter),

    sales: (filter?: GstReportFilter): Promise<GstReportRow[]> =>
      ipcRenderer.invoke('gstReport:sales', filter)
  },

  fineReport: {
    rojmel: (filter?: FineReportFilter): Promise<FineRojmelResult> =>
      ipcRenderer.invoke('fineReport:rojmel', filter),

    margin: (filter?: FineReportFilter): Promise<FineMarginResult> =>
      ipcRenderer.invoke('fineReport:margin', filter)
  },

  dailyReport: {
    summary: (filter?: DailySummaryFilter): Promise<DailySummaryResult> =>
      ipcRenderer.invoke('dailyReport:summary', filter)
  },

  backup: {
    create: (): Promise<BackupResult> => ipcRenderer.invoke('backup:create'),
    getLast: (): Promise<LastBackupInfo> => ipcRenderer.invoke('backup:get-last'),
    restore: (): Promise<BackupResult> => ipcRenderer.invoke('backup:restore')
  },

  firm: {
    get: (): Promise<FirmRecord> => ipcRenderer.invoke('firm:get'),
    save: (payload: FirmPayload): Promise<FirmRecord> => ipcRenderer.invoke('firm:save', payload)
  },

  printerSetting: {
    get: (): Promise<PrinterSettingRecord> => ipcRenderer.invoke('printer-setting:get'),
    save: (payload: PrinterSettingPayload): Promise<PrinterSettingRecord> =>
      ipcRenderer.invoke('printer-setting:save', payload)
  },

  jobWork: {
    getNextNumber: (): Promise<string> => ipcRenderer.invoke('job-work:next-number'),

    create: (payload: JobWorkOrderPayload): Promise<SavedJobWorkRecord> =>
      ipcRenderer.invoke('job-work:create', payload),

    update: (id: string, payload: JobWorkOrderPayload): Promise<SavedJobWorkRecord> =>
      ipcRenderer.invoke('job-work:update', id, payload),

    list: (): Promise<JobWorkRegisterRecord[]> => ipcRenderer.invoke('job-work:list'),

    getById: (id: string): Promise<SavedJobWorkRecord> =>
      ipcRenderer.invoke('job-work:get-by-id', id),

    remove: (id: string): Promise<{ success: boolean; orderNo: string }> =>
      ipcRenderer.invoke('job-work:delete', id),

    receiveGoods: (id: string, payload: JobWorkReceiptPayload): Promise<SavedJobWorkRecord> =>
      ipcRenderer.invoke('job-work:receive-goods', id, payload)
  },

  repairEntry: {
    getNextNumber: (): Promise<string> => ipcRenderer.invoke('repair-entries:next-number'),

    create: (payload: RepairEntryPayload): Promise<RepairEntryRecord> =>
      ipcRenderer.invoke('repair-entries:create', payload),

    update: (id: string, payload: RepairEntryPayload): Promise<RepairEntryRecord> =>
      ipcRenderer.invoke('repair-entries:update', id, payload),

    list: (): Promise<RepairEntryRecord[]> => ipcRenderer.invoke('repair-entries:list'),

    getById: (id: string): Promise<RepairEntryRecord> =>
      ipcRenderer.invoke('repair-entries:get-by-id', id),

    remove: (id: string): Promise<{ success: boolean; repairNo: string }> =>
      ipcRenderer.invoke('repair-entries:delete', id),

    completeRepair: (id: string, payload: CompleteRepairPayload): Promise<RepairEntryRecord> =>
      ipcRenderer.invoke('repair-entries:complete-repair', id, payload),

    markDelivered: (id: string, payload: MarkDeliveredPayload): Promise<RepairEntryRecord> =>
      ipcRenderer.invoke('repair-entries:mark-delivered', id, payload)
  },

  transfers: {
    getNextNumber: (): Promise<string> => ipcRenderer.invoke('transfers:next-number'),

    create: (payload: TransferPayload): Promise<TransferRecord> =>
      ipcRenderer.invoke('transfers:create', payload),

    list: (): Promise<TransferRecord[]> => ipcRenderer.invoke('transfers:list'),

    getById: (id: string): Promise<TransferRecord> =>
      ipcRenderer.invoke('transfers:get-by-id', id),

    remove: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('transfers:delete', id)
  },

  weightScans: {
    create: (payload: WeightScanPayload): Promise<WeightScanRecord> =>
      ipcRenderer.invoke('weight-scans:create', payload),

    list: (): Promise<WeightScanRecord[]> => ipcRenderer.invoke('weight-scans:list'),

    getById: (id: string): Promise<WeightScanRecord> =>
      ipcRenderer.invoke('weight-scans:get-by-id', id),

    remove: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('weight-scans:delete', id)
  },

  sauda: {
    getNextNumber: (): Promise<string> => ipcRenderer.invoke('sauda:next-number'),

    create: (payload: SaudaPayload): Promise<SaudaRecord> =>
      ipcRenderer.invoke('sauda:create', payload),

    update: (id: string, payload: SaudaPayload): Promise<SaudaRecord> =>
      ipcRenderer.invoke('sauda:update', id, payload),

    list: (): Promise<SaudaRecord[]> => ipcRenderer.invoke('sauda:list'),

    getById: (id: string): Promise<SaudaRecord> => ipcRenderer.invoke('sauda:get-by-id', id),

    close: (id: string): Promise<SaudaRecord> => ipcRenderer.invoke('sauda:close', id),

    remove: (id: string): Promise<{ success: boolean }> => ipcRenderer.invoke('sauda:delete', id)
  },

  orderPayal: {
    getNextNumber: (): Promise<string> => ipcRenderer.invoke('order-payal:next-number'),

    create: (payload: OrderPayalPayload): Promise<OrderPayalRecord> =>
      ipcRenderer.invoke('order-payal:create', payload),

    update: (id: string, payload: OrderPayalPayload): Promise<OrderPayalRecord> =>
      ipcRenderer.invoke('order-payal:update', id, payload),

    list: (): Promise<OrderPayalRecord[]> => ipcRenderer.invoke('order-payal:list'),

    getById: (id: string): Promise<OrderPayalRecord> =>
      ipcRenderer.invoke('order-payal:get-by-id', id),

    markDelivered: (id: string): Promise<OrderPayalRecord> =>
      ipcRenderer.invoke('order-payal:mark-delivered', id),

    remove: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('order-payal:delete', id)
  },

  settlements: {
    getNextNumber: (): Promise<string> => ipcRenderer.invoke('settlements:next-number'),

    create: (payload: SettlementPayload): Promise<SettlementRecord> =>
      ipcRenderer.invoke('settlements:create', payload),

    list: (): Promise<SettlementRecord[]> => ipcRenderer.invoke('settlements:list'),

    getById: (id: string): Promise<SettlementRecord> =>
      ipcRenderer.invoke('settlements:get-by-id', id),

    remove: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('settlements:delete', id)
  },

  reminder: {
    list: (): Promise<ReminderRecord[]> => ipcRenderer.invoke('reminder:list')
  },

  whatsapp: {
    send: (payload: WhatsAppSendPayload): Promise<WhatsAppSendResult> =>
      ipcRenderer.invoke('whatsapp:send', payload)
  },

  screenshot: {
    capture: (): Promise<ScreenshotCaptureResult> => ipcRenderer.invoke('screenshot:capture'),

    list: (): Promise<ScreenshotListRecord[]> => ipcRenderer.invoke('screenshot:list'),

    openFolder: (): Promise<{ success: boolean }> => ipcRenderer.invoke('screenshot:openFolder')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
