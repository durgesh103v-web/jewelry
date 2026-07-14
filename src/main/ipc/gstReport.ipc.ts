import { ipcMain } from 'electron'
import { gstReportService, type GstReportFilter } from '../services/gstReport.service'

export function registerGstReportIpc(): void {
  ipcMain.handle('gstReport:purchases', (_event, filter?: GstReportFilter) => {
    return gstReportService.listGstPurchases(filter)
  })

  ipcMain.handle('gstReport:sales', (_event, filter?: GstReportFilter) => {
    return gstReportService.listGstSales(filter)
  })
}
