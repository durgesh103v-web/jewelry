/// <reference types="vite/client" />

type AccountGroupPayload = {
  groupName: string
  groupType: string
  description: string
  active: boolean
}

type AccountGroupRecord = AccountGroupPayload & {
  id: string
  createdAt: string
  updatedAt: string
}

type ItemGroupPayload = {
  groupName: string
  metalType: string
  description: string
  active: boolean
}

type ItemGroupRecord = ItemGroupPayload & {
  id: string
  createdAt: string
  updatedAt: string
}

type ItemStampPayload = {
  stampName: string
  metalType: string
  description: string
  active: boolean
}

type ItemStampRecord = ItemStampPayload & {
  id: string
  createdAt: string
  updatedAt: string
}

type ItemDesignPayload = {
  designName: string
  metalType: string
  description: string
  active: boolean
}

type ItemDesignRecord = ItemDesignPayload & {
  id: string
  createdAt: string
  updatedAt: string
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

type ItemRecord = ItemPayload & {
  id: string
  groupName: string
  stampName: string
  designName: string
  createdAt: string
  updatedAt: string
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
  unit: string
  active: boolean
}

type ItemOpeningStockRecord = ItemOpeningStockPayload & {
  id: string
  itemName: string
  metalType: string
  stampName: string
  designName: string
  netWeight: number
  fine: number
  createdAt: string
  updatedAt: string
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

type CashBookReportFilter = {
  fromDate?: string
  toDate?: string
}

type CashBookReportRow = {
  id: string
  voucherDate: string
  voucherNo: string
  voucherType: 'RECEIPT' | 'PAYMENT'
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
type BackupResult = {
  success: boolean
  cancelled: boolean
  fileName?: string
  backupPath?: string
  message: string
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
  accountGroupId: string
  mobileNumber: string
  whatsappNumber: string
  city: string
  state: string
  gstNo: string
  panNo: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  active: boolean
}

type AccountRecord = AccountPayload & {
  id: string
  groupName: string
  groupType: string
  createdAt: string
  updatedAt: string
}

interface Window {
  api: {
    accountGroups: {
      list: () => Promise<AccountGroupRecord[]>
      create: (payload: AccountGroupPayload) => Promise<AccountGroupRecord>
      update: (id: string, payload: AccountGroupPayload) => Promise<AccountGroupRecord>
      remove: (id: string) => Promise<{ success: boolean }>
    }

    itemGroups: {
      list: () => Promise<ItemGroupRecord[]>
      create: (payload: ItemGroupPayload) => Promise<ItemGroupRecord>
      update: (id: string, payload: ItemGroupPayload) => Promise<ItemGroupRecord>
      remove: (id: string) => Promise<{ success: boolean }>
    }

    itemStamps: {
      list: () => Promise<ItemStampRecord[]>
      create: (payload: ItemStampPayload) => Promise<ItemStampRecord>
      update: (id: string, payload: ItemStampPayload) => Promise<ItemStampRecord>
      remove: (id: string) => Promise<{ success: boolean }>
    }

    itemDesigns: {
      list: () => Promise<ItemDesignRecord[]>
      create: (payload: ItemDesignPayload) => Promise<ItemDesignRecord>
      update: (id: string, payload: ItemDesignPayload) => Promise<ItemDesignRecord>
      remove: (id: string) => Promise<{ success: boolean }>
    }

    items: {
      list: () => Promise<ItemRecord[]>
      create: (payload: ItemPayload) => Promise<ItemRecord>
      update: (id: string, payload: ItemPayload) => Promise<ItemRecord>
      remove: (id: string) => Promise<{ success: boolean }>
    }

    itemOpeningStock: {
      list: () => Promise<ItemOpeningStockRecord[]>
      create: (payload: ItemOpeningStockPayload) => Promise<ItemOpeningStockRecord>
      update: (id: string, payload: ItemOpeningStockPayload) => Promise<ItemOpeningStockRecord>
      remove: (id: string) => Promise<{ success: boolean }>
    }

    accounts: {
      list: () => Promise<AccountRecord[]>
      create: (payload: AccountPayload) => Promise<AccountRecord>
      update: (id: string, payload: AccountPayload) => Promise<AccountRecord>
      remove: (id: string) => Promise<{ success: boolean }>
    }

    cashVoucher: {
      getNextNumber: (voucherType: CashVoucherType) => Promise<string>
      create: (payload: CashVoucherPayload) => Promise<CashVoucherRecord>
      update: (id: string, payload: CashVoucherPayload) => Promise<CashVoucherRecord>
      remove: (id: string) => Promise<{ success: boolean }>
      delete: (id: string) => Promise<{ success: boolean }>
      getById: (id: string) => Promise<CashVoucherRecord>
      list: (filter?: CashVoucherFilter) => Promise<CashVoucherRecord[]>
    }
    sales: {
      getNextNumber: () => Promise<string>
      getAccountBalance: (accountId: string) => Promise<AccountBalanceRecord>
      create: (payload: SalePayload) => Promise<SavedSaleRecord>
      list: () => Promise<SaleRegisterRecord[]>
      getById: (id: string) => Promise<SavedSaleRecord>
      cancel: (id: string) => Promise<{ success: boolean; saleNo: string }>
    }

    purchases: {
      getNextNumber: () => Promise<string>
      getAccountBalance: (accountId: string) => Promise<AccountBalanceRecord>
      create: (payload: PurchasePayload) => Promise<SavedPurchaseRecord>
      list: () => Promise<PurchaseRegisterRecord[]>
      getById: (id: string) => Promise<SavedPurchaseRecord>
      cancel: (id: string) => Promise<{ success: boolean; purchaseNo: string }>
    }

    cashBookReport: {
      get: (filter?: CashBookReportFilter) => Promise<CashBookReportResult>
    }
    reports: {
      accountBalance: () => Promise<AccountBalanceReportRecord[]>
      accountLedgerDetails: (accountId: string) => Promise<AccountLedgerDetailsRecord>
      itemStock: () => Promise<ItemStockReportRecord[]>
      itemTransactions: () => Promise<ItemTransactionReportRecord[]>
      accountWiseSalePurchase: () => Promise<AccountWiseSalePurchaseRecord[]>
      cashBook: (filter?: CashBookReportFilter) => Promise<CashBookReportResult>
    }

    backup: {
      create: () => Promise<BackupResult>
      restore: () => Promise<BackupResult>
    }

    firm: {
      get: () => Promise<FirmRecord>
      save: (payload: FirmPayload) => Promise<FirmRecord>
    }

    printerSetting: {
      get: () => Promise<PrinterSettingRecord>
      save: (payload: PrinterSettingPayload) => Promise<PrinterSettingRecord>
    }
  }
}
