import { ipcMain } from 'electron'
import { fineReportService, type FineReportFilter } from '../services/fineReport.service'

export function registerFineReportIpc(): void {
  ipcMain.handle('fineReport:rojmel', (_event, filter?: FineReportFilter) => {
    return fineReportService.getFineRojmel(filter)
  })

  ipcMain.handle('fineReport:margin', (_event, filter?: FineReportFilter) => {
    return fineReportService.getFineMargin(filter)
  })
}
