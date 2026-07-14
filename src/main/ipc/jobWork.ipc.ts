import { ipcMain } from 'electron'
import { jobWorkService } from '../services/jobWork.service'

export function registerJobWorkIpc(): void {
  ipcMain.handle('job-work:next-number', () => {
    return jobWorkService.getNextJobWorkNo()
  })

  ipcMain.handle('job-work:create', (_event, payload) => {
    return jobWorkService.create(payload)
  })

  ipcMain.handle('job-work:update', (_event, id: string, payload) => {
    return jobWorkService.update(id, payload)
  })

  ipcMain.handle('job-work:list', () => {
    return jobWorkService.list()
  })

  ipcMain.handle('job-work:get-by-id', (_event, id: string) => {
    return jobWorkService.getById(id)
  })

  ipcMain.handle('job-work:delete', (_event, id: string) => {
    return jobWorkService.delete(id)
  })

  ipcMain.handle('job-work:receive-goods', (_event, id: string, payload) => {
    return jobWorkService.receiveGoods(id, payload)
  })
}
