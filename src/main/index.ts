import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerAccountGroupIpc } from './ipc/accountGroup.ipc'
import { registerAccountIpc } from './ipc/account.ipc'
import { registerItemGroupIpc } from './ipc/itemGroup.ipc'
import { registerItemStampIpc } from './ipc/itemStamp.ipc'
import { registerItemDesignIpc } from './ipc/itemDesign.ipc'
import { registerItemIpc } from './ipc/item.ipc'
import { registerItemOpeningStockIpc } from './ipc/itemOpeningStock.ipc'
import { registerSaleIpc } from './ipc/sale.ipc'
import { registerApprovalIpc } from './ipc/approval.ipc'
import { registerEstimateIpc } from './ipc/estimate.ipc'
import { registerPurchaseIpc } from './ipc/purchase.ipc'
import { registerPurchaseReturnIpc } from './ipc/purchaseReturn.ipc'
import { registerSaleReturnIpc } from './ipc/saleReturn.ipc'
import { registerReportIpc } from './ipc/report.ipc'
import { registerGstReportIpc } from './ipc/gstReport.ipc'
import { registerFineReportIpc } from './ipc/fineReport.ipc'
import { registerDailyReportIpc } from './ipc/dailyReport.ipc'
import { registerBackupIpc } from './ipc/backup.ipc'
import { registerFirmIpc } from './ipc/firm.ipc'
import { registerPrinterSettingIpc } from './ipc/printerSetting.ipc'
import { registerCashVoucherIpc } from './ipc/cashVoucher.ipc'
import { registerCashFineOpeningIpc } from './ipc/cashFineOpening.ipc'
import { registerJobWorkIpc } from './ipc/jobWork.ipc'
import { registerRepairEntryIpc } from './ipc/repairEntry.ipc'
import { registerTransferIpc } from './ipc/transfer.ipc'
import { registerUserIpc } from './ipc/user.ipc'
import { registerFinancialYearIpc } from './ipc/financialYear.ipc'
import { registerWeightScanIpc } from './ipc/weightScan.ipc'
import { registerSaudaIpc } from './ipc/sauda.ipc'
import { registerOrderPayalIpc } from './ipc/orderPayal.ipc'
import { registerSettlementIpc } from './ipc/settlement.ipc'
import { registerReminderIpc } from './ipc/reminder.ipc'
import { registerWhatsAppIpc } from './ipc/whatsapp.ipc'
import { registerScreenshotIpc } from './ipc/screenshot.ipc'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'Jewellery ERP',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  registerAccountGroupIpc()
  registerAccountIpc()
  registerItemGroupIpc()
  registerItemStampIpc()
  registerItemDesignIpc()
  registerItemIpc()
  registerItemOpeningStockIpc()
  registerSaleIpc()
  registerApprovalIpc()
  registerEstimateIpc()
  registerPurchaseIpc()
  registerPurchaseReturnIpc()
  registerSaleReturnIpc()
  registerReportIpc()
  registerGstReportIpc()
  registerFineReportIpc()
  registerDailyReportIpc()
  registerBackupIpc()
  registerFirmIpc()
  registerPrinterSettingIpc()
  registerCashVoucherIpc()
  registerCashFineOpeningIpc()
  registerJobWorkIpc()
  registerRepairEntryIpc()
  registerTransferIpc()
  registerWeightScanIpc()
  registerSaudaIpc()
  registerOrderPayalIpc()
  registerSettlementIpc()
  registerUserIpc()
  registerFinancialYearIpc()
  registerReminderIpc()
  registerWhatsAppIpc()
  registerScreenshotIpc()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
