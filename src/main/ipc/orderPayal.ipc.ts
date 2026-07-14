import { ipcMain } from 'electron'
import { orderPayalService } from '../services/orderPayal.service'

export function registerOrderPayalIpc(): void {
  ipcMain.handle('order-payal:next-number', () => {
    return orderPayalService.getNextNumber()
  })

  ipcMain.handle('order-payal:create', (_event, payload) => {
    return orderPayalService.create(payload)
  })

  ipcMain.handle('order-payal:update', (_event, id: string, payload) => {
    return orderPayalService.update(id, payload)
  })

  ipcMain.handle('order-payal:list', () => {
    return orderPayalService.list()
  })

  ipcMain.handle('order-payal:get-by-id', (_event, id: string) => {
    return orderPayalService.getById(id)
  })

  ipcMain.handle('order-payal:mark-delivered', (_event, id: string) => {
    return orderPayalService.markDelivered(id)
  })

  ipcMain.handle('order-payal:delete', (_event, id: string) => {
    return orderPayalService.delete(id)
  })
}
