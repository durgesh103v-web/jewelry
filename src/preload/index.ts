import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type AccountGroupPayload = {
  groupName: string
  groupType: string
  description: string
  active: boolean
}

const api = {
  accountGroups: {
    list: () => ipcRenderer.invoke('account-groups:list'),

    create: (payload: AccountGroupPayload) => ipcRenderer.invoke('account-groups:create', payload),

    update: (id: string, payload: AccountGroupPayload) =>
      ipcRenderer.invoke('account-groups:update', id, payload),

    remove: (id: string) => ipcRenderer.invoke('account-groups:delete', id)
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
