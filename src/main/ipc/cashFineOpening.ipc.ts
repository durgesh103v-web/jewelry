import { ipcMain } from 'electron'
import { cashFineOpeningService } from '../services/cashFineOpening.service'

export function registerCashFineOpeningIpc(): void {
  ipcMain.handle('cash-fine-opening:get', () => {
    return cashFineOpeningService.get()
  })

  ipcMain.handle('cash-fine-opening:save', (_event, payload) => {
    return cashFineOpeningService.save(payload)
  })
}
