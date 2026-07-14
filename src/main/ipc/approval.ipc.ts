import { ipcMain } from 'electron'
import { approvalService } from '../services/approval.service'

export function registerApprovalIpc(): void {
  ipcMain.handle('approvals:next-number', () => {
    return approvalService.getNextApprovalNo()
  })

  ipcMain.handle('approvals:create', (_event, payload) => {
    return approvalService.create(payload)
  })

  ipcMain.handle('approvals:update', (_event, id: string, payload) => {
    return approvalService.update(id, payload)
  })

  ipcMain.handle('approvals:list', () => {
    return approvalService.list()
  })

  ipcMain.handle('approvals:get-by-id', (_event, id: string) => {
    return approvalService.getById(id)
  })

  ipcMain.handle('approvals:delete', (_event, id: string) => {
    return approvalService.delete(id)
  })

  ipcMain.handle('approvals:convert-to-sale', (_event, id: string) => {
    return approvalService.convertToSale(id)
  })

  ipcMain.handle('approvals:return', (_event, id: string, payload) => {
    return approvalService.returnApproval(id, payload)
  })
}
