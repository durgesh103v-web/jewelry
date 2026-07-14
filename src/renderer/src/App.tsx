import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { appMenus } from './config/appMenus'
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
            className="screen-btn"
            type="button"
            onClick={() => openQuickScreen('screenshot', 'Screen Shot', 'utility')}
          >
            &#128247; Screen Shot
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

function Dashboard({
  openQuickScreen
}: {
  openQuickScreen: (id: string, label: string, module: AppMenuChild['module']) => void
}): React.JSX.Element {
  return (
    <>
      <div className="quick-row">
        <button className="search-btn" type="button">
          Search
        </button>
        <input className="search-input" aria-label="Search" />

        <button
          className="tile sale-tile"
          type="button"
          onClick={() => openQuickScreen('sale', 'Sale', 'transaction')}
        >
          <span>&#128717;&#65039;</span>
          <strong>SALE</strong>
          <small>Sale</small>
        </button>

        <button
          className="tile purchase-tile"
          type="button"
          onClick={() => openQuickScreen('purchase', 'Purchase', 'transaction')}
        >
          <span>&#129534;</span>
          <strong>Purchase</strong>
          <small>Purchase</small>
        </button>

        <button
          className="tile backup-tile"
          type="button"
          onClick={() => openQuickScreen('backup', 'Backup', 'utility')}
        >
          <span>&#128452;&#65039;</span>
          <strong>Backup</strong>
          <small>Backup</small>
        </button>

        <button
          className="tile reminder-tile"
          type="button"
          onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
        >
          <span>&#128276;</span>
          <strong>Reminder</strong>
          <small>Reminder</small>
        </button>
      </div>

      <section className="logo-card" aria-label="Jewellery ERP logo area">
        <div className="logo-icon">&#128142;</div>
        <h1>JEWELLERY</h1>
        <p>ERP Desktop Software</p>
      </section>
    </>
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
