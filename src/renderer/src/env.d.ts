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
  }
}
