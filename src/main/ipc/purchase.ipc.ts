import { ipcMain } from 'electron'
import { purchaseService } from '../services/purchase.service'

export function registerPurchaseIpc(): void {
  ipcMain.handle('purchases:next-number', () => {
    return purchaseService.getNextPurchaseNo()
  })

  ipcMain.handle('purchases:account-balance', (_event, accountId: string) => {
    return purchaseService.getAccountBalance(accountId)
  })

  ipcMain.handle('purchases:create', (_event, payload) => {
    return purchaseService.create(payload)
  })

  ipcMain.handle('purchases:list', () => {
    return purchaseService.list()
  })

  ipcMain.handle('purchases:get-by-id', (_event, id: string) => {
    return purchaseService.getById(id)
  })

  ipcMain.handle('purchases:cancel', (_event, id: string) => {
    return purchaseService.cancel(id)
  })
}
