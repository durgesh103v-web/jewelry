import { ipcMain } from 'electron'
import { accountBalanceService } from '../services/accountBalance.service'
import { stockReportService } from '../services/stockReport.service'

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
}
