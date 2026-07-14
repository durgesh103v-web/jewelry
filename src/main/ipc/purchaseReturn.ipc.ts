import { ipcMain } from 'electron'
import { purchaseReturnService } from '../services/purchaseReturn.service'

export function registerPurchaseReturnIpc(): void {
  ipcMain.handle('purchase-returns:next-number', () => {
    return purchaseReturnService.getNextPurchaseReturnNo()
  })

  ipcMain.handle('purchase-returns:account-balance', (_event, accountId: string) => {
    return purchaseReturnService.getAccountBalance(accountId)
  })

  ipcMain.handle('purchase-returns:create', (_event, payload) => {
    return purchaseReturnService.create(payload)
  })

  ipcMain.handle('purchase-returns:update', (_event, id: string, payload) => {
    return purchaseReturnService.update(id, payload)
  })

  ipcMain.handle('purchase-returns:list', () => {
    return purchaseReturnService.list()
  })

  ipcMain.handle('purchase-returns:get-by-id', (_event, id: string) => {
    return purchaseReturnService.getById(id)
  })

  ipcMain.handle('purchase-returns:delete', (_event, id: string) => {
    return purchaseReturnService.delete(id)
  })
}
