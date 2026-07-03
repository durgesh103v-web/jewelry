import { ipcMain } from 'electron'
import { accountBalanceService } from '../services/accountBalance.service'

export function registerReportIpc(): void {
  ipcMain.handle('reports:account-balance', () => {
    return accountBalanceService.listAccountBalances()
  })
}
