import { ipcMain } from 'electron'
import { accountGroupService } from '../services/accountGroup.service'

export function registerAccountGroupIpc(): void {
  ipcMain.handle('account-groups:list', () => {
    return accountGroupService.list()
  })

  ipcMain.handle('account-groups:create', (_event, payload) => {
    return accountGroupService.create(payload)
  })

  ipcMain.handle('account-groups:update', (_event, id: string, payload) => {
    return accountGroupService.update(id, payload)
  })

  ipcMain.handle('account-groups:delete', (_event, id: string) => {
    return accountGroupService.delete(id)
  })
}
