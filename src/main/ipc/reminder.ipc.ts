import { ipcMain } from 'electron'
import { reminderService } from '../services/reminder.service'

export function registerReminderIpc(): void {
  ipcMain.handle('reminder:list', () => {
    return reminderService.list()
  })
}
