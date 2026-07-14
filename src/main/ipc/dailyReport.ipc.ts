import { ipcMain } from 'electron'
import { dailyReportService, type DailySummaryFilter } from '../services/dailyReport.service'

export function registerDailyReportIpc(): void {
  ipcMain.handle('dailyReport:summary', (_event, filter?: DailySummaryFilter) => {
    return dailyReportService.getDailySummary(filter)
  })
}
