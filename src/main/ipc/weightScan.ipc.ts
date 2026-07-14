import { ipcMain } from 'electron'
import { weightScanService } from '../services/weightScan.service'

export function registerWeightScanIpc(): void {
  ipcMain.handle('weight-scans:create', (_event, payload) => {
    return weightScanService.create(payload)
  })

  ipcMain.handle('weight-scans:list', () => {
    return weightScanService.list()
  })

  ipcMain.handle('weight-scans:get-by-id', (_event, id: string) => {
    return weightScanService.getById(id)
  })

  ipcMain.handle('weight-scans:delete', (_event, id: string) => {
    return weightScanService.delete(id)
  })
}
