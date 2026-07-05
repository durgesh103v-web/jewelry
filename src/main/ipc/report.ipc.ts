import { ipcMain } from 'electron'
import { accountBalanceService } from '../services/accountBalance.service'
import { stockReportService } from '../services/stockReport.service'
import { salePurchaseReportService } from '../services/salePurchaseReport.service'
import { getCashBookReport } from '../services/cashBookReport.service'

export function registerReportIpc(): void {
  ipcMain.handle('reports:account-balance', () => {
    return accountBalanceService.listAccountBalances()
  })

  ipcMain.handle('reports:account-ledger-details', (_event, accountId: string) => {
    return accountBalanceService.getAccountLedgerDetails(accountId)
  })

  ipcMain.handle('reports:item-stock', () => {
    return stockReportService.listItemStock()
  })

  ipcMain.handle('reports:item-transactions', () => {
    return stockReportService.listItemTransactions()
  })

  ipcMain.handle('reports:account-wise-sale-purchase', () => {
    return salePurchaseReportService.listAccountWiseSalePurchase()
  })

  ipcMain.handle('cashBookReport:get', (_event, filter) => {
    return getCashBookReport(filter)
  })

  ipcMain.handle('reports:cash-book', (_event, filter) => {
    return getCashBookReport(filter)
  })
}
