import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type AccountGroupPayload = {
  groupName: string
  groupType: string
  description: string
  active: boolean
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
  unit: string
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

type BackupResult = {
  success: boolean
  cancelled: boolean
  fileName?: string
  backupPath?: string
  message: string
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

const api = {
  accountGroups: {
    list: () => ipcRenderer.invoke('account-groups:list'),

    create: (payload: AccountGroupPayload) => ipcRenderer.invoke('account-groups:create', payload),

    update: (id: string, payload: AccountGroupPayload) =>
      ipcRenderer.invoke('account-groups:update', id, payload),

    remove: (id: string) => ipcRenderer.invoke('account-groups:delete', id)
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

    remove: (id: string) => ipcRenderer.invoke('items:delete', id)
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

  sales: {
    getNextNumber: () => ipcRenderer.invoke('sales:next-number'),

    getAccountBalance: (accountId: string) =>
      ipcRenderer.invoke('sales:account-balance', accountId),

    create: (payload: SalePayload): Promise<SavedSaleRecord> =>
      ipcRenderer.invoke('sales:create', payload),

    list: (): Promise<SaleRegisterRecord[]> => ipcRenderer.invoke('sales:list'),

    getById: (id: string): Promise<SavedSaleRecord> => ipcRenderer.invoke('sales:get-by-id', id),

    cancel: (id: string): Promise<{ success: boolean; saleNo: string }> =>
      ipcRenderer.invoke('sales:cancel', id)
  },

  reports: {
    accountBalance: (): Promise<AccountBalanceReportRecord[]> =>
      ipcRenderer.invoke('reports:account-balance'),

    accountLedgerDetails: (accountId: string): Promise<AccountLedgerDetailsRecord> =>
      ipcRenderer.invoke('reports:account-ledger-details', accountId),

    itemStock: (): Promise<ItemStockReportRecord[]> => ipcRenderer.invoke('reports:item-stock'),

    itemTransactions: (): Promise<ItemTransactionReportRecord[]> =>
      ipcRenderer.invoke('reports:item-transactions')
  },

  backup: {
    create: (): Promise<BackupResult> => ipcRenderer.invoke('backup:create'),
    restore: (): Promise<BackupResult> => ipcRenderer.invoke('backup:restore')
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
