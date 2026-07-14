import { ipcMain } from 'electron'
import { repairEntryService } from '../services/repairEntry.service'

export function registerRepairEntryIpc(): void {
  ipcMain.handle('repair-entries:next-number', () => {
    return repairEntryService.getNextRepairNo()
  })

  ipcMain.handle('repair-entries:create', (_event, payload) => {
    return repairEntryService.create(payload)
  })

  ipcMain.handle('repair-entries:update', (_event, id: string, payload) => {
    return repairEntryService.update(id, payload)
  })

  ipcMain.handle('repair-entries:list', () => {
    return repairEntryService.list()
  })

  ipcMain.handle('repair-entries:get-by-id', (_event, id: string) => {
    return repairEntryService.getById(id)
  })

  ipcMain.handle('repair-entries:delete', (_event, id: string) => {
    return repairEntryService.delete(id)
  })

  ipcMain.handle('repair-entries:complete-repair', (_event, id: string, payload) => {
    return repairEntryService.completeRepair(id, payload)
  })

  ipcMain.handle('repair-entries:mark-delivered', (_event, id: string, payload) => {
    return repairEntryService.markDelivered(id, payload)
  })
}
