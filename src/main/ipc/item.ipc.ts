import { ipcMain } from 'electron'
import { itemService } from '../services/item.service'

export function registerItemIpc(): void {
  ipcMain.handle('items:list', () => {
    return itemService.list()
  })

  ipcMain.handle('items:create', (_event, payload) => {
    return itemService.create(payload)
  })

  ipcMain.handle('items:update', (_event, id: string, payload) => {
    return itemService.update(id, payload)
  })

  ipcMain.handle('items:delete', (_event, id: string) => {
    return itemService.delete(id)
  })

  ipcMain.handle('items:assignBarcode', (_event, id: string) => {
    return itemService.assignBarcode(id)
  })

  ipcMain.handle('items:regenerateBarcode', (_event, id: string) => {
    return itemService.regenerateBarcode(id)
  })
}
