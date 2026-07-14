import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { appMenus } from './config/appMenus'
import AppAlert from './components/ui/AppAlert'
import { getFriendlyErrorMessage } from './utils/getFriendlyErrorMessage'
import AccountGroupScreen from './modules/master/account-group/AccountGroupScreen'
import AccountMasterScreen from './modules/master/account-master/AccountMasterScreen'
import ItemGroupScreen from './modules/master/item-group/ItemGroupScreen'
import ItemStampScreen from './modules/master/item-stamp/ItemStampScreen'
import ItemDesignScreen from './modules/master/item-design/ItemDesignScreen'
import ItemMasterScreen from './modules/master/item-master/ItemMasterScreen'
import ItemOpeningStockScreen from './modules/master/item-opening-stock/ItemOpeningStockScreen'
import FirmMasterScreen from './modules/master/firm-master/FirmMasterScreen'
import CashFineOpeningScreen from './modules/master/cash-fine-opening/CashFineOpeningScreen'
import SaleScreen from './modules/transaction/sale/SaleScreen'
import SaleReturnScreen from './modules/transaction/sale-return/SaleReturnScreen'
import ApprovalScreen from './modules/transaction/approval/ApprovalScreen'
import PurchaseScreen from './modules/transaction/purchase/PurchaseScreen'
import PurchaseReturnScreen from './modules/transaction/purchase-return/PurchaseReturnScreen'
import JobWorkScreen from './modules/transaction/job-work/JobWorkScreen'
import RepairEntryScreen from './modules/transaction/repair-entry/RepairEntryScreen'
import TransferScreen from './modules/transaction/transfer/TransferScreen'
import WeightScanScreen from './modules/transaction/weight-scan/WeightScanScreen'
import SaudaBookScreen from './modules/transaction/sauda-book/SaudaBookScreen'
import OrderPayalScreen from './modules/transaction/order-payal/OrderPayalScreen'
import SettlementScreen from './modules/transaction/settlement/SettlementScreen'
import PurchaseRegisterScreen from './modules/transaction/purchase-register/PurchaseRegisterScreen'
import CashVoucherScreen from './modules/transaction/cash-voucher/CashVoucherScreen'
import SaleRegisterScreen from './modules/transaction/sale-register/SaleRegisterScreen'
import AccountBalanceReportScreen from './modules/reports/account-balance/AccountBalanceReportScreen'
import OutstandingReportScreen from './modules/reports/outstanding/OutstandingReportScreen'
import CashBookReportScreen from './modules/reports/cash-book/CashBookReportScreen'
import BankTransactionsReportScreen from './modules/reports/bank-transactions/BankTransactionsReportScreen'
import AccountwiseDetailsReportScreen from './modules/reports/accountwise-details/AccountwiseDetailsReportScreen'
import PartyStatementScreen from './modules/reports/party-statement/PartyStatementScreen'
import AccountWiseSalePurchaseReportScreen from './modules/reports/account-wise-sale-purchase/AccountWiseSalePurchaseReportScreen'
import DarRojmelReportScreen from './modules/reports/dar-rojmel/DarRojmelReportScreen'
import AccountwiseSummaryReportScreen from './modules/reports/accountwise-summary/AccountwiseSummaryReportScreen'
import ItemwiseSalePurchaseReportScreen from './modules/reports/itemwise-sale-purchase/ItemwiseSalePurchaseReportScreen'
import ItemSalePurchaseCityWiseReportScreen from './modules/reports/item-sale-purchase-city-wise/ItemSalePurchaseCityWiseReportScreen'
import PaymentReceiptReportScreen from './modules/reports/payment-receipt/PaymentReceiptReportScreen'
import ItemStockReportScreen from './modules/reports/item-stock/ItemStockReportScreen'
import ItemTransactionReportScreen from './modules/reports/item-transaction/ItemTransactionReportScreen'
import StockLedgerScreen from './modules/reports/stock-ledger/StockLedgerScreen'
import GstPurchaseReportScreen from './modules/gst/gst-purchase/GstPurchaseReportScreen'
import GstSaleReportScreen from './modules/gst/gst-sale/GstSaleReportScreen'
import RetailSaleEstimateScreen from './modules/gst/retail-sale-estimate/RetailSaleEstimateScreen'
import EstimateRegisterScreen from './modules/gst/estimate-register/EstimateRegisterScreen'
import FineRojmelReportScreen from './modules/reports/fine-rojmel/FineRojmelReportScreen'
import FineMarginReportScreen from './modules/reports/fine-margin/FineMarginReportScreen'
import DailySummaryReportScreen from './modules/reports/daily-summary/DailySummaryReportScreen'
import BackupRestoreScreen from './modules/utility/backup-restore/BackupRestoreScreen'
import PrinterSettingScreen from './modules/utility/printer-setting/PrinterSettingScreen'
import UserManagementScreen from './modules/utility/user-management/UserManagementScreen'
import FinancialYearScreen from './modules/utility/financial-year/FinancialYearScreen'
import BarcodePrintingScreen from './modules/utility/barcode-printing/BarcodePrintingScreen'
import DeleteSaleBillsScreen from './modules/utility/delete-sale-bills/DeleteSaleBillsScreen'
import ReminderScreen from './modules/utility/reminder/ReminderScreen'
import WhatsAppScreen from './modules/utility/whatsapp/WhatsAppScreen'
import ScreenshotScreen from './modules/utility/screenshot/ScreenshotScreen'
import SettingsScreen from './modules/utility/settings/SettingsScreen'
import type { AppMenuChild, WorkspaceTab } from './types/menu'

const dashboardTab: WorkspaceTab = {
  id: 'dashboard',
  label: 'Dashboard',
  module: 'home'
}

function formatTopBarDateTime(value: string): string {
  if (!value) return '-'

  const [datePart, timePart = ''] = value.split(' ')
  const [year, month, day] = datePart.split('-')

  if (!year || !month || !day) return value

  const shortTime = timePart ? timePart.slice(0, 5) : ''

  return `${day}/${month}/${year}${shortTime ? ` ${shortTime}` : ''}`
}

function App(): React.JSX.Element {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [tabs, setTabs] = useState<WorkspaceTab[]>([dashboardTab])
  const [activeTabId, setActiveTabId] = useState('dashboard')
  const [topFirmName, setTopFirmName] = useState('Demo')
  const [lastBackupLabel, setLastBackupLabel] = useState('-')
  const [capturingScreenshot, setCapturingScreenshot] = useState(false)
  const [screenshotToast, setScreenshotToast] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const screenshotToastTimerRef = useRef<number | null>(null)

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? dashboardTab

  const loadTopBarInfo = useCallback(async (): Promise<void> => {
    try {
      const [firm, lastBackup] = await Promise.all([
        window.api.firm.get(),
        window.api.backup.getLast()
      ])

      setTopFirmName(firm?.firmName || 'Demo')
      setLastBackupLabel(formatTopBarDateTime(lastBackup?.backupAt || ''))
    } catch {
      setTopFirmName('Demo')
      setLastBackupLabel('-')
    }
  }, [])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadTopBarInfo()
    }, 0)

    const handleTopBarRefresh = (): void => {
      void loadTopBarInfo()
    }

    window.addEventListener('erp:backup-created', handleTopBarRefresh)
    window.addEventListener('erp:firm-updated', handleTopBarRefresh)

    return () => {
      window.clearTimeout(loadTimer)
      window.removeEventListener('erp:backup-created', handleTopBarRefresh)
      window.removeEventListener('erp:firm-updated', handleTopBarRefresh)
    }
  }, [loadTopBarInfo])

  const openScreen = (screen: AppMenuChild): void => {
    setTabs((currentTabs) => {
      const alreadyOpen = currentTabs.some((tab) => tab.id === screen.id)

      if (alreadyOpen) {
        return currentTabs
      }

      return [
        ...currentTabs,
        {
          id: screen.id,
          label: screen.label,
          module: screen.module
        }
      ]
    })

    setActiveTabId(screen.id)
    setOpenMenu(null)
  }

  const closeTab = (tabId: string): void => {
    if (tabId === 'dashboard') return

    setTabs((currentTabs) => {
      const filteredTabs = currentTabs.filter((tab) => tab.id !== tabId)

      if (activeTabId === tabId) {
        const closedTabIndex = currentTabs.findIndex((tab) => tab.id === tabId)
        const nextActiveTab = filteredTabs[closedTabIndex - 1] ?? filteredTabs[0] ?? dashboardTab
        setActiveTabId(nextActiveTab.id)
      }

      return filteredTabs
    })
  }

  const openQuickScreen = (id: string, label: string, module: AppMenuChild['module']): void => {
    openScreen({
      id,
      label,
      module
    })
  }

  const showScreenshotToast = useCallback((type: 'success' | 'error', message: string): void => {
    setScreenshotToast({ type, message })

    if (screenshotToastTimerRef.current) {
      window.clearTimeout(screenshotToastTimerRef.current)
    }

    screenshotToastTimerRef.current = window.setTimeout(() => {
      setScreenshotToast(null)
    }, 3500)
  }, [])

  useEffect(() => {
    return () => {
      if (screenshotToastTimerRef.current) {
        window.clearTimeout(screenshotToastTimerRef.current)
      }
    }
  }, [])

  const handleQuickScreenshot = async (): Promise<void> => {
    try {
      setCapturingScreenshot(true)
      const result = await window.api.screenshot.capture()
      showScreenshotToast('success', `Screenshot saved: ${result.fileName}`)
    } catch (error) {
      showScreenshotToast('error', getFriendlyErrorMessage(error))
    } finally {
      setCapturingScreenshot(false)
    }
  }

  return (
    <div className="app">
      <div className="top-bar">
        <nav className="menu-bar" aria-label="Application menu">
          {appMenus.map((menu) => (
            <div
              key={menu.id}
              className="menu-item"
              onMouseEnter={() => setOpenMenu(menu.id)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                className="menu-button"
                type="button"
                onClick={() =>
                  setOpenMenu((currentMenu) => (currentMenu === menu.id ? null : menu.id))
                }
              >
                {menu.label}
              </button>

              {openMenu === menu.id && (
                <div className="dropdown">
                  {menu.children.map((child) => (
                    <button
                      key={child.id}
                      className="dropdown-item"
                      type="button"
                      onClick={() => openScreen(child)}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="top-actions">
          <label htmlFor="firm-select">Firm</label>
          <select
            id="firm-select"
            className="firm-select"
            value={topFirmName}
            onChange={() => undefined}
          >
            <option value={topFirmName}>{topFirmName}</option>
          </select>

          <button className="last-backup" type="button">
            Last Backup {lastBackupLabel}
          </button>
          <button
            className="header-icon-btn"
            type="button"
            title="Take a screenshot of the current screen"
            aria-label="Take a screenshot of the current screen"
            onClick={() => void handleQuickScreenshot()}
            disabled={capturingScreenshot}
          >
            {capturingScreenshot ? '⏳' : '\u{1F4F7}'}
          </button>
          <button
            className="whatsapp-btn"
            type="button"
            onClick={() => openQuickScreen('whatsapp', 'WhatsApp', 'utility')}
          >
            &#128994; WhatsApp
          </button>
        </div>
      </div>

      {screenshotToast && (
        <div className="header-toast">
          <AppAlert
            type={screenshotToast.type}
            message={screenshotToast.message}
            onClose={() => setScreenshotToast(null)}
          />
        </div>
      )}

      <main className="workspace">
        {activeTab.id === 'dashboard' ? (
          <Dashboard openQuickScreen={openQuickScreen} />
        ) : activeTab.id === 'account-group' ? (
          <AccountGroupScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'account-master' ? (
          <AccountMasterScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'item-group' ? (
          <ItemGroupScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'item-stamp' ? (
          <ItemStampScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'item-design' ? (
          <ItemDesignScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'item-master' ? (
          <ItemMasterScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'item-opening-stock' ? (
          <ItemOpeningStockScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'firm-master' ? (
          <FirmMasterScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'cash-fine-opening' ? (
          <CashFineOpeningScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'sale' ? (
          <SaleScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'sale-return' ? (
          <SaleReturnScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'approval' ? (
          <ApprovalScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'purchase' ? (
          <PurchaseScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'purchase-return' ? (
          <PurchaseReturnScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'job-work' ? (
          <JobWorkScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'repair-entry' ? (
          <RepairEntryScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'cash-payment-nave' ? (
          <CashVoucherScreen initialVoucherType="PAYMENT" onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'cash-receipt-jama' ? (
          <CashVoucherScreen initialVoucherType="RECEIPT" onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'transfer' ? (
          <TransferScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'weight-scan' ? (
          <WeightScanScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'sauda-book' ? (
          <SaudaBookScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'order-payal' ? (
          <OrderPayalScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'settlement' ? (
          <SettlementScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'purchase-register' ? (
          <PurchaseRegisterScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'sale-register' ? (
          <SaleRegisterScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'account-balance' ? (
          <AccountBalanceReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'outstanding' ? (
          <OutstandingReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'cash-book' ? (
          <CashBookReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'bank-transactions' ? (
          <BankTransactionsReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'fine-rojmel' ? (
          <FineRojmelReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'fine-margin' ? (
          <FineMarginReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'daily-summary-report' ? (
          <DailySummaryReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'accountwise-details' ? (
          <AccountwiseDetailsReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'party-statement' ? (
          <PartyStatementScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'account-wise-sale-purchase' ? (
          <AccountWiseSalePurchaseReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'dar-rojmel' ? (
          <DarRojmelReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'accountwise-summary' ? (
          <AccountwiseSummaryReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'itemwise-sale-purchase' ? (
          <ItemwiseSalePurchaseReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'item-sale-purchase-city-wise' ? (
          <ItemSalePurchaseCityWiseReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'payment-receipt' ? (
          <PaymentReceiptReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'item-stock' ? (
          <ItemStockReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'item-transaction' ? (
          <ItemTransactionReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'stock-ledger' ? (
          <StockLedgerScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'gst-purchase' ? (
          <GstPurchaseReportScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'retail-sale-gst' ? (
          <GstSaleReportScreen
            onClose={() => closeTab(activeTab.id)}
            title="Retail Sale GST"
            helpText="Retail Sale GST lists retail sale bills with taxable amount and CGST / SGST / IGST split. Amounts show zero until GST fields are captured during Sale entry."
          />
        ) : activeTab.id === 'gst-sale-register' ? (
          <GstSaleReportScreen
            onClose={() => closeTab(activeTab.id)}
            title="GST Sale Register"
            helpText="GST Sale Register lists all sale bills with taxable amount and CGST / SGST / IGST split. Amounts show zero until GST fields are captured during Sale entry."
          />
        ) : activeTab.id === 'retail-sale-estimate' ? (
          <RetailSaleEstimateScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'estimate-register' ? (
          <EstimateRegisterScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'backup' || activeTab.id === 'restore-backup' ? (
          <BackupRestoreScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'printer-setting' ? (
          <PrinterSettingScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'barcode-printing' ? (
          <BarcodePrintingScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'user-management' ? (
          <UserManagementScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'financial-year' ? (
          <FinancialYearScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'delete-sale-bills' ? (
          <DeleteSaleBillsScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'reminder' ? (
          <ReminderScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'whatsapp' ? (
          <WhatsAppScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'screenshot' ? (
          <ScreenshotScreen onClose={() => closeTab(activeTab.id)} />
        ) : activeTab.id === 'settings' ? (
          <SettingsScreen onClose={() => closeTab(activeTab.id)} onNavigate={openQuickScreen} />
        ) : (
          <ModulePlaceholder tab={activeTab} onClose={() => closeTab(activeTab.id)} />
        )}
      </main>

      <footer className="bottom-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === activeTabId ? 'workspace-tab active-tab' : 'workspace-tab'}
            type="button"
            onClick={() => setActiveTabId(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.id !== 'dashboard' && (
              <span
                className="tab-close"
                onClick={(event) => {
                  event.stopPropagation()
                  closeTab(tab.id)
                }}
              >
                &times;
              </span>
            )}
          </button>
        ))}
      </footer>
    </div>
  )
}

const emptyDailySummary: DailySummaryResult = {
  date: '',
  sales: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0, amountTotal: 0 },
  purchases: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0, amountTotal: 0 },
  saleReturns: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  purchaseReturns: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  cashReceipts: { count: 0, amountTotal: 0 },
  cashPayments: { count: 0, amountTotal: 0 },
  approvals: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  cash: { openingBalance: 0, totalReceipt: 0, totalPayment: 0, closingBalance: 0, netMovement: 0 },
  fine: { goldIn: 0, goldOut: 0, goldNet: 0, silverIn: 0, silverOut: 0, silverNet: 0 }
}

function formatDashboardNumber(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

const quickActionItems: Array<{
  id: string
  label: string
  module: AppMenuChild['module']
  icon: string
  tileClass: string
}> = [
  { id: 'sale', label: 'Sale', module: 'transaction', icon: '\u{1F9FE}', tileClass: 'sale-tile' },
  {
    id: 'purchase',
    label: 'Purchase',
    module: 'transaction',
    icon: '\u{1F9BE}',
    tileClass: 'purchase-tile'
  },
  {
    id: 'cash-receipt-jama',
    label: 'Cash Receipt',
    module: 'transaction',
    icon: '\u{1F4B0}',
    tileClass: 'receipt-tile'
  },
  {
    id: 'cash-payment-nave',
    label: 'Cash Payment',
    module: 'transaction',
    icon: '\u{1F4B8}',
    tileClass: 'payment-tile'
  },
  {
    id: 'account-master',
    label: 'Accounts',
    module: 'master',
    icon: '\u{1F465}',
    tileClass: 'account-tile'
  },
  {
    id: 'item-master',
    label: 'Items',
    module: 'master',
    icon: '\u{1F48D}',
    tileClass: 'item-tile'
  },
  {
    id: 'account-balance',
    label: 'Reports',
    module: 'reports',
    icon: '\u{1F4CA}',
    tileClass: 'report-tile'
  },
  { id: 'backup', label: 'Backup', module: 'utility', icon: '\u{1F4BE}', tileClass: 'backup-tile' },
  {
    id: 'reminder',
    label: 'Reminder',
    module: 'utility',
    icon: '\u{1F514}',
    tileClass: 'reminder-tile'
  }
]

function Dashboard({
  openQuickScreen
}: {
  openQuickScreen: (id: string, label: string, module: AppMenuChild['module']) => void
}): React.JSX.Element {
  const [dailySummary, setDailySummary] = useState<DailySummaryResult>(emptyDailySummary)
  const [outstanding, setOutstanding] = useState<OutstandingReportResult | null>(null)
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([
      window.api.dailyReport.summary(),
      window.api.reports.outstanding(),
      window.api.reminder.list()
    ])
      .then(([summaryResult, outstandingResult, reminderResult]) => {
        if (cancelled) return
        setDailySummary(summaryResult)
        setOutstanding(outstandingResult)
        setReminders(reminderResult)
      })
      .catch(() => {
        // Dashboard degrades gracefully to zeroed KPI cards if any report fails to load.
      })

    return () => {
      cancelled = true
    }
  }, [])

  const overdueReminders = useMemo(() => reminders.filter((item) => item.isOverdue), [reminders])
  const upcomingReminders = useMemo(
    () => reminders.filter((item) => !item.isOverdue).slice(0, 5),
    [reminders]
  )

  const filteredQuickActions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return quickActionItems
    return quickActionItems.filter((item) => item.label.toLowerCase().includes(term))
  }, [searchTerm])

  return (
    <div className="dashboard">
      <div className="dashboard-kpi-row">
        <div className="kpi-card kpi-sale">
          <span className="kpi-label">Today&apos;s Sale</span>
          <strong className="kpi-value">{dailySummary.sales.count} Bills</strong>
          <span className="kpi-sub">Majuri Rs. {formatDashboardNumber(dailySummary.sales.amountTotal)}</span>
        </div>

        <div className="kpi-card kpi-purchase">
          <span className="kpi-label">Today&apos;s Purchase</span>
          <strong className="kpi-value">{dailySummary.purchases.count} Bills</strong>
          <span className="kpi-sub">
            Majuri Rs. {formatDashboardNumber(dailySummary.purchases.amountTotal)}
          </span>
        </div>

        <div className="kpi-card kpi-cash">
          <span className="kpi-label">Cash In Hand</span>
          <strong className="kpi-value">Rs. {formatDashboardNumber(dailySummary.cash.closingBalance)}</strong>
          <span className="kpi-sub">Today&apos;s net Rs. {formatDashboardNumber(dailySummary.cash.netMovement)}</span>
        </div>

        <div className="kpi-card kpi-receivable">
          <span className="kpi-label">Receivable</span>
          <strong className="kpi-value">{outstanding?.receivable.length ?? 0} A/c</strong>
          <span className="kpi-sub">Accounts owing the firm</span>
        </div>

        <div className="kpi-card kpi-payable">
          <span className="kpi-label">Payable</span>
          <strong className="kpi-value">{outstanding?.payable.length ?? 0} A/c</strong>
          <span className="kpi-sub">Accounts the firm owes</span>
        </div>

        <div className="kpi-card kpi-reminder">
          <span className="kpi-label">Reminders</span>
          <strong className="kpi-value">{overdueReminders.length} Overdue</strong>
          <span className="kpi-sub">{upcomingReminders.length} upcoming</span>
        </div>
      </div>

      <div className="dashboard-main-grid">
        <section className="dashboard-quick-actions" aria-label="Quick actions">
          <div className="dashboard-section-title">
            <span>Quick Actions</span>
          </div>

          <div className="quick-row">
            <button className="search-btn" type="button">
              Search
            </button>
            <input
              className="search-input"
              aria-label="Search quick actions"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search a module..."
            />
          </div>

          <div className="dashboard-tile-grid">
            {filteredQuickActions.map((item) => (
              <button
                key={item.id}
                className={`tile ${item.tileClass}`}
                type="button"
                onClick={() => openQuickScreen(item.id, item.label, item.module)}
              >
                <span>{item.icon}</span>
                <strong>{item.label}</strong>
              </button>
            ))}

            {filteredQuickActions.length === 0 && (
              <div className="dashboard-tile-empty">No matching module.</div>
            )}
          </div>
        </section>

        <aside className="dashboard-side-panel">
          <section className="dashboard-brand-card" aria-label="Jewellery ERP branding">
            <div className="logo-icon">&#128142;</div>
            <h1>JEWELLERY</h1>
            <p>ERP Desktop Software</p>
          </section>

          <section className="dashboard-reminders-card" aria-label="Upcoming reminders">
            <div className="dashboard-section-title">
              <span>Upcoming Reminders</span>
              <button
                type="button"
                className="dashboard-view-all-btn"
                onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
              >
                View All
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="dashboard-empty-text">No reminders scheduled.</p>
            ) : (
              <ul className="dashboard-reminder-list">
                {[...overdueReminders, ...upcomingReminders].slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className={item.isOverdue ? 'dashboard-reminder-row overdue' : 'dashboard-reminder-row'}
                  >
                    <span className="dashboard-reminder-name">{item.accountName || 'Unknown'}</span>
                    <span className="dashboard-reminder-meta">
                      {item.type} #{item.billNo} &middot; {item.reminderDate}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function ModulePlaceholder({
  tab,
  onClose
}: {
  tab: WorkspaceTab
  onClose: () => void
}): React.JSX.Element {
  return (
    <section className="module-placeholder">
      <div className="module-window">
        <div className="module-title-bar">
          <span>{tab.label}</span>

          <div className="module-title-actions">
            <span>Module: {tab.module}</span>
            <button className="module-close-btn" type="button" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        <div className="module-body">
          <h2>{tab.label}</h2>
          <p>This screen will be developed here.</p>

          <div className="module-note">
            <strong>Next:</strong> We will start with Master - Account Group, then Account Master,
            Item Master, Opening Stock, and after that Sale.
          </div>
        </div>
      </div>
    </section>
  )
}

export default App
