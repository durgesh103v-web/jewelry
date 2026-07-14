import { ipcMain } from 'electron'
import { saleService } from '../services/sale.service'

export function registerSaleIpc(): void {
  ipcMain.handle('sales:next-number', () => {
    return saleService.getNextSaleNo()
  })

  ipcMain.handle('sales:account-balance', (_event, accountId: string) => {
    return saleService.getAccountBalance(accountId)
  })

  ipcMain.handle('sales:create', (_event, payload) => {
    return saleService.create(payload)
  })

  ipcMain.handle('sales:list', () => {
    return saleService.list()
  })

  ipcMain.handle('sales:get-by-id', (_event, id: string) => {
    return saleService.getById(id)
  })

  ipcMain.handle('sales:cancel', (_event, id: string, reason?: string) => {
    return saleService.cancel(id, reason)
  })

  ipcMain.handle('sales:list-all-for-delete', () => {
    return saleService.listAllForDelete()
  })
}
