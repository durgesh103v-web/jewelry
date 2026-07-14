import { ipcMain } from 'electron'
import { estimateService } from '../services/estimate.service'

export function registerEstimateIpc(): void {
  ipcMain.handle('estimates:next-number', () => {
    return estimateService.getNextEstimateNo()
  })

  ipcMain.handle('estimates:create', (_event, payload) => {
    return estimateService.create(payload)
  })

  ipcMain.handle('estimates:update', (_event, id: string, payload) => {
    return estimateService.update(id, payload)
  })

  ipcMain.handle('estimates:list', () => {
    return estimateService.list()
  })

  ipcMain.handle('estimates:get-by-id', (_event, id: string) => {
    return estimateService.getById(id)
  })

  ipcMain.handle('estimates:delete', (_event, id: string) => {
    return estimateService.delete(id)
  })

  ipcMain.handle('estimates:convert-to-sale', (_event, id: string) => {
    return estimateService.convertToSale(id)
  })
}
