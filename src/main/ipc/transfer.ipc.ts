import { ipcMain } from 'electron'
import { transferService } from '../services/transfer.service'

export function registerTransferIpc(): void {
  ipcMain.handle('transfers:next-number', () => {
    return transferService.getNextNumber()
  })

  ipcMain.handle('transfers:create', (_event, payload) => {
    return transferService.create(payload)
  })

  ipcMain.handle('transfers:list', () => {
    return transferService.list()
  })

  ipcMain.handle('transfers:get-by-id', (_event, id: string) => {
    return transferService.getById(id)
  })

  ipcMain.handle('transfers:delete', (_event, id: string) => {
    return transferService.delete(id)
  })
}
