import { ipcMain } from 'electron'
import { printerSettingService } from '../services/printerSetting.service'

export function registerPrinterSettingIpc(): void {
  ipcMain.handle('printer-setting:get', () => {
    return printerSettingService.get()
  })

  ipcMain.handle('printer-setting:save', (_event, payload) => {
    return printerSettingService.save(payload)
  })
}
