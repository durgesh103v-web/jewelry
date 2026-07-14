import { ipcMain } from 'electron'
import { financialYearService } from '../services/financialYear.service'

export function registerFinancialYearIpc(): void {
  ipcMain.handle('financial-years:list', () => {
    return financialYearService.list()
  })

  ipcMain.handle('financial-years:get-current', () => {
    return financialYearService.getCurrent()
  })

  ipcMain.handle('financial-years:create', (_event, payload) => {
    return financialYearService.create(payload)
  })

  ipcMain.handle('financial-years:update', (_event, id: string, payload) => {
    return financialYearService.update(id, payload)
  })

  ipcMain.handle('financial-years:set-current', (_event, id: string) => {
    return financialYearService.setCurrent(id)
  })

  ipcMain.handle('financial-years:toggle-closed', (_event, id: string, isClosed: boolean) => {
    return financialYearService.toggleClosed(id, isClosed)
  })

  ipcMain.handle('financial-years:delete', (_event, id: string) => {
    return financialYearService.delete(id)
  })
}
