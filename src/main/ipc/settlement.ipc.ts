import { ipcMain } from 'electron'
import { settlementService } from '../services/settlement.service'

export function registerSettlementIpc(): void {
  ipcMain.handle('settlements:next-number', () => {
    return settlementService.getNextNumber()
  })

  ipcMain.handle('settlements:create', (_event, payload) => {
    return settlementService.create(payload)
  })

  ipcMain.handle('settlements:list', () => {
    return settlementService.list()
  })

  ipcMain.handle('settlements:get-by-id', (_event, id: string) => {
    return settlementService.getById(id)
  })

  ipcMain.handle('settlements:delete', (_event, id: string) => {
    return settlementService.delete(id)
  })
}
