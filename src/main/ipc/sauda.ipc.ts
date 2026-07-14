import { ipcMain } from 'electron'
import { saudaService } from '../services/sauda.service'

export function registerSaudaIpc(): void {
  ipcMain.handle('sauda:next-number', () => {
    return saudaService.getNextNumber()
  })

  ipcMain.handle('sauda:create', (_event, payload) => {
    return saudaService.create(payload)
  })

  ipcMain.handle('sauda:update', (_event, id: string, payload) => {
    return saudaService.update(id, payload)
  })

  ipcMain.handle('sauda:list', () => {
    return saudaService.list()
  })

  ipcMain.handle('sauda:get-by-id', (_event, id: string) => {
    return saudaService.getById(id)
  })

  ipcMain.handle('sauda:close', (_event, id: string) => {
    return saudaService.closeSauda(id)
  })

  ipcMain.handle('sauda:delete', (_event, id: string) => {
    return saudaService.delete(id)
  })
}
