import { ipcMain } from 'electron'
import { saleReturnService } from '../services/saleReturn.service'

export function registerSaleReturnIpc(): void {
  ipcMain.handle('sale-returns:next-number', () => {
    return saleReturnService.getNextSaleReturnNo()
  })

  ipcMain.handle('sale-returns:account-balance', (_event, accountId: string) => {
    return saleReturnService.getAccountBalance(accountId)
  })

  ipcMain.handle('sale-returns:create', (_event, payload) => {
    return saleReturnService.create(payload)
  })

  ipcMain.handle('sale-returns:update', (_event, id: string, payload) => {
    return saleReturnService.update(id, payload)
  })

  ipcMain.handle('sale-returns:list', () => {
    return saleReturnService.list()
  })

  ipcMain.handle('sale-returns:get-by-id', (_event, id: string) => {
    return saleReturnService.getById(id)
  })

  ipcMain.handle('sale-returns:delete', (_event, id: string) => {
    return saleReturnService.delete(id)
  })
}
