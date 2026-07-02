import { ipcMain } from 'electron'
import { accountService } from '../services/account.service'

export function registerAccountIpc(): void {
  ipcMain.handle('accounts:list', () => {
    return accountService.list()
  })

  ipcMain.handle('accounts:create', (_event, payload) => {
    return accountService.create(payload)
  })

  ipcMain.handle('accounts:update', (_event, id: string, payload) => {
    return accountService.update(id, payload)
  })

  ipcMain.handle('accounts:delete', (_event, id: string) => {
    return accountService.delete(id)
  })
}
