import { ipcMain } from 'electron'
import { itemGroupService } from '../services/itemGroup.service'

export function registerItemGroupIpc(): void {
  ipcMain.handle('item-groups:list', () => {
    return itemGroupService.list()
  })

  ipcMain.handle('item-groups:create', (_event, payload) => {
    return itemGroupService.create(payload)
  })

  ipcMain.handle('item-groups:update', (_event, id: string, payload) => {
    return itemGroupService.update(id, payload)
  })

  ipcMain.handle('item-groups:delete', (_event, id: string) => {
    return itemGroupService.delete(id)
  })
}
