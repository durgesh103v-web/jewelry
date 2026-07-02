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
