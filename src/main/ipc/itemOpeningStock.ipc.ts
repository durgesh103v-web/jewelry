import { ipcMain } from 'electron'
import { itemOpeningStockService } from '../services/itemOpeningStock.service'

export function registerItemOpeningStockIpc(): void {
  ipcMain.handle('item-opening-stock:list', () => {
    return itemOpeningStockService.list()
  })

  ipcMain.handle('item-opening-stock:create', (_event, payload) => {
    return itemOpeningStockService.create(payload)
  })

  ipcMain.handle('item-opening-stock:update', (_event, id: string, payload) => {
    return itemOpeningStockService.update(id, payload)
  })

  ipcMain.handle('item-opening-stock:delete', (_event, id: string) => {
    return itemOpeningStockService.delete(id)
  })
}
