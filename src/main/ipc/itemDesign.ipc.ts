import { ipcMain } from 'electron'
import { itemDesignService } from '../services/itemDesign.service'

export function registerItemDesignIpc(): void {
  ipcMain.handle('item-designs:list', () => {
    return itemDesignService.list()
  })

  ipcMain.handle('item-designs:create', (_event, payload) => {
    return itemDesignService.create(payload)
  })

  ipcMain.handle('item-designs:update', (_event, id: string, payload) => {
    return itemDesignService.update(id, payload)
  })

  ipcMain.handle('item-designs:delete', (_event, id: string) => {
    return itemDesignService.delete(id)
  })
}
