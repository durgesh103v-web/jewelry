import { ipcMain } from 'electron'
import { cashVoucherService } from '../services/cashVoucher.service'
import type { CashVoucherType } from '../../shared/types/cashVoucher'

export function registerCashVoucherIpc(): void {
  ipcMain.handle('cash-vouchers:next-number', (_event, voucherType: CashVoucherType) => {
    return cashVoucherService.getNextVoucherNo(voucherType)
  })

  ipcMain.handle('cash-vouchers:create', (_event, payload) => {
    return cashVoucherService.create(payload)
  })

  ipcMain.handle('cash-vouchers:update', (_event, id: string, payload) => {
    return cashVoucherService.update(id, payload)
  })

  ipcMain.handle('cash-vouchers:delete', (_event, id: string) => {
    return cashVoucherService.delete(id)
  })

  ipcMain.handle('cash-vouchers:get-by-id', (_event, id: string) => {
    return cashVoucherService.getById(id)
  })

  ipcMain.handle('cash-vouchers:list', (_event, filter) => {
    return cashVoucherService.list(filter)
  })

  ipcMain.handle('cashVoucher:create', (_event, payload) => {
    return cashVoucherService.create(payload)
  })

  ipcMain.handle('cashVoucher:update', (_event, payload) => {
    return cashVoucherService.update(payload.id, payload)
  })

  ipcMain.handle('cashVoucher:delete', (_event, id: string) => {
    return cashVoucherService.delete(id)
  })

  ipcMain.handle('cashVoucher:getById', (_event, id: string) => {
    return cashVoucherService.getById(id)
  })

  ipcMain.handle('cashVoucher:list', (_event, filter) => {
    return cashVoucherService.list(filter)
  })
}
