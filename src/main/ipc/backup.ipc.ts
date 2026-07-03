import { ipcMain } from 'electron'
import { backupService } from '../services/backup.service'

export function registerBackupIpc(): void {
  ipcMain.handle('backup:create', () => {
    return backupService.createBackup()
  })

  ipcMain.handle('backup:restore', () => {
    return backupService.restoreBackup()
  })
}
