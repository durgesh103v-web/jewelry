import { ipcMain } from 'electron'
import { accountBalanceService } from '../services/accountBalance.service'
import { stockReportService } from '../services/stockReport.service'
import { salePurchaseReportService } from '../services/salePurchaseReport.service'
import { getCashBookReport } from '../services/cashBookReport.service'
import { getBankTransactionsReport } from '../services/bankTransactionsReport.service'
import { getDarRojmelReport } from '../services/darRojmelReport.service'
import { accountwiseSummaryReportService } from '../services/accountwiseSummaryReport.service'
import { itemwiseSalePurchaseReportService } from '../services/itemwiseSalePurchaseReport.service'
import { itemSalePurchaseCityWiseReportService } from '../services/itemSalePurchaseCityWiseReport.service'
import { getPaymentReceiptReport } from '../services/paymentReceiptReport.service'

export function registerReportIpc(): void {
  ipcMain.handle('reports:account-balance', () => {
    return accountBalanceService.listAccountBalances()
  })

  ipcMain.handle(
    'reports:account-ledger-details',
    (_event, accountId: string, filter?: { fromDate?: string; toDate?: string }) => {
      return accountBalanceService.getAccountLedgerDetails(accountId, filter)
    }
  )

  ipcMain.handle('reports:outstanding', () => {
    return accountBalanceService.getOutstandingBalances()
  })

  ipcMain.handle('reports:item-stock', () => {
    return stockReportService.listItemStock()
  })

  ipcMain.handle('reports:item-transactions', () => {
    return stockReportService.listItemTransactions()
  })

  ipcMain.handle(
    'reports:item-stock-ledger',
    (_event, itemId: string, filter?: { fromDate?: string; toDate?: string }) => {
      return stockReportService.getItemStockLedger(itemId, filter)
    }
  )

  ipcMain.handle('reports:account-wise-sale-purchase', () => {
    return salePurchaseReportService.listAccountWiseSalePurchase()
  })

  ipcMain.handle('cashBookReport:get', (_event, filter) => {
    return getCashBookReport(filter)
  })

  ipcMain.handle('reports:cash-book', (_event, filter) => {
    return getCashBookReport(filter)
  })

  ipcMain.handle('reports:bank-transactions', (_event, filter) => {
    return getBankTransactionsReport(filter)
  })

  ipcMain.handle('reports:dar-rojmel', (_event, filter) => {
    return getDarRojmelReport(filter)
  })

  ipcMain.handle('reports:accountwise-summary', () => {
    return accountwiseSummaryReportService.listAccountwiseSummary()
  })

  ipcMain.handle('reports:itemwise-sale-purchase', () => {
    return itemwiseSalePurchaseReportService.listItemwiseSalePurchase()
  })

  ipcMain.handle('reports:item-sale-purchase-city-wise', () => {
    return itemSalePurchaseCityWiseReportService.listItemSalePurchaseCityWise()
  })

  ipcMain.handle('reports:payment-receipt', (_event, filter) => {
    return getPaymentReceiptReport(filter)
  })
}
