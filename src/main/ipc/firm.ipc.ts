import { ipcMain } from 'electron'
import { firmService } from '../services/firm.service'

export function registerFirmIpc(): void {
  ipcMain.handle('firm:get', () => {
    return firmService.get()
  })

  ipcMain.handle('firm:save', (_event, payload) => {
    return firmService.save(payload)
  })
}
