import { ipcMain } from 'electron'
import { itemStampService } from '../services/itemStamp.service'

export function registerItemStampIpc(): void {
  ipcMain.handle('item-stamps:list', () => {
    return itemStampService.list()
  })

  ipcMain.handle('item-stamps:create', (_event, payload) => {
    return itemStampService.create(payload)
  })

  ipcMain.handle('item-stamps:update', (_event, id: string, payload) => {
    return itemStampService.update(id, payload)
  })

  ipcMain.handle('item-stamps:delete', (_event, id: string) => {
    return itemStampService.delete(id)
  })
}
