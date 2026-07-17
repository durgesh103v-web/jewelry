import type { AppMenu, BusinessTypeValue } from '../types/menu'

// Business type is chosen once at registration and locked.
// Items tagged visibility: 'wholesale' are hidden for a Retailer installation.
// Everything else defaults to 'both'.
export const appMenus: AppMenu[] = [
  {
    id: 'master',
    label: 'Master',
    children: [
      { id: 'account-master', label: 'Account Master', module: 'master' },
      { id: 'account-group', label: 'Account Group', module: 'master' },
      { id: 'item-master', label: 'Item Master', module: 'master' },
      { id: 'item-group', label: 'Item Group', module: 'master' },
      { id: 'item-stamp', label: 'Item Stamp', module: 'master' },
      { id: 'item-design', label: 'Item Design', module: 'master' },
      { id: 'item-opening-stock', label: 'Item Opening Stock', module: 'master' },
      { id: 'firm-master', label: 'Firm Master', module: 'master' },
      {
        id: 'cash-fine-opening',
        label: 'Cash Fine Opening',
        module: 'master',
        visibility: 'wholesale'
      }
    ]
  },
  {
    id: 'transaction',
    label: 'Transaction',
    children: [
      { id: 'sale', label: 'Sale', module: 'transaction', visibility: 'wholesale' },
      { id: 'sale-return', label: 'Sale Return', module: 'transaction', visibility: 'wholesale' },
      { id: 'approval', label: 'Approval', module: 'transaction', visibility: 'wholesale' },
      { id: 'purchase', label: 'Purchase', module: 'transaction', visibility: 'wholesale' },
      {
        id: 'purchase-return',
        label: 'Purchase Return',
        module: 'transaction',
        visibility: 'wholesale'
      },
      { id: 'job-work', label: 'Job Work', module: 'transaction', visibility: 'wholesale' },
      { id: 'repair-entry', label: 'Repair Entry', module: 'transaction' },
      { id: 'cash-payment-nave', label: 'Cash Payment / Nave', module: 'transaction' },
      { id: 'cash-receipt-jama', label: 'Cash Receipt / Jama', module: 'transaction' },
      { id: 'transfer', label: 'Transfer', module: 'transaction', visibility: 'wholesale' },
      { id: 'weight-scan', label: 'Weight Scan', module: 'transaction' },
      { id: 'sauda-book', label: 'Sauda Book', module: 'transaction', visibility: 'wholesale' },
      { id: 'order-payal', label: 'Order Payal', module: 'transaction' },
      { id: 'settlement', label: 'Settlement', module: 'transaction', visibility: 'wholesale' }
    ]
  },
  {
    id: 'gst-estimate',
    label: 'GST / Estimate',
    children: [
      { id: 'retail-sale-gst', label: 'Retail Sale GST', module: 'gst-estimate' },
      { id: 'retail-sale-estimate', label: 'Retail Sale Estimate', module: 'gst-estimate' },
      { id: 'gst-purchase', label: 'GST Purchase', module: 'gst-estimate' },
      { id: 'gst-sale-register', label: 'GST Sale Register', module: 'gst-estimate' },
      { id: 'estimate-register', label: 'Estimate Register', module: 'gst-estimate' }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    children: [
      { id: 'cash-book', label: 'Cash Book', module: 'reports' },
      { id: 'bank-transactions', label: 'Bank Transactions', module: 'reports' },
      { id: 'daily-summary-report', label: 'Daily Summary Report', module: 'reports' },
      { id: 'fine-rojmel', label: 'Fine Rojmel', module: 'reports', visibility: 'wholesale' },
      { id: 'dar-rojmel', label: 'Dar Rojmel', module: 'reports', visibility: 'wholesale' },
      { id: 'account-balance', label: 'Account Balance', module: 'reports' },
      { id: 'outstanding', label: 'Outstanding', module: 'reports' },
      { id: 'sale-register', label: 'Sale Register', module: 'reports' },
      { id: 'purchase-register', label: 'Purchase Register', module: 'reports' },
      {
        id: 'accountwise-summary',
        label: 'Accountwise Summary',
        module: 'reports',
        visibility: 'wholesale'
      },
      {
        id: 'account-wise-sale-purchase',
        label: 'Account Wise Sale Purchase',
        module: 'reports',
        visibility: 'wholesale'
      },
      { id: 'accountwise-details', label: 'Accountwise Details', module: 'reports' },
      { id: 'party-statement', label: 'Party Statement', module: 'reports' },
      { id: 'item-stock', label: 'Item Stock', module: 'reports' },
      { id: 'item-transaction', label: 'Item Transaction', module: 'reports' },
      { id: 'stock-ledger', label: 'Stock Ledger', module: 'reports' },
      { id: 'itemwise-sale-purchase', label: 'Itemwise Sale Purchase', module: 'reports' },
      {
        id: 'item-sale-purchase-city-wise',
        label: 'Item Sale Purchase City Wise',
        module: 'reports',
        visibility: 'wholesale'
      },
      { id: 'fine-margin', label: 'Fine Margin', module: 'reports', visibility: 'wholesale' },
      { id: 'payment-receipt', label: 'Payment / Receipt', module: 'reports' },
      { id: 'delete-sale-bills', label: 'Delete Sale Bills', module: 'reports' }
    ]
  },
  {
    id: 'utility',
    label: 'Utility',
    children: [
      { id: 'backup', label: 'Backup', module: 'utility' },
      { id: 'restore-backup', label: 'Restore Backup', module: 'utility' },
      { id: 'barcode-printing', label: 'Barcode Printing', module: 'utility' },
      { id: 'reminder', label: 'Reminder', module: 'utility' },
      { id: 'screenshot', label: 'Screen Shot', module: 'utility' },
      { id: 'whatsapp', label: 'WhatsApp', module: 'utility' },
      { id: 'printer-setting', label: 'Printer Setting', module: 'utility' },
      { id: 'change-password', label: 'Change Password', module: 'utility' },
      { id: 'financial-year', label: 'Financial Year', module: 'utility' },
      { id: 'settings', label: 'Settings', module: 'utility' }
    ]
  }
]

function isChildVisible(visibility: AppMenu['children'][number]['visibility'], type: BusinessTypeValue): boolean {
  const effective = visibility ?? 'both'
  if (effective === 'both') return true
  if (type === 'WHOLESALE') return effective === 'wholesale'
  return effective === 'retail'
}

// Returns a copy of the menus with children the current business type may not
// see removed, and any menu that ends up empty dropped entirely.
export function getMenusForBusinessType(type: BusinessTypeValue): AppMenu[] {
  return appMenus
    .map((menu) => ({
      ...menu,
      children: menu.children.filter((child) => isChildVisible(child.visibility, type))
    }))
    .filter((menu) => menu.children.length > 0)
}

// Flat set of every screen id the current business type is allowed to open.
// Used to gate dashboard quick actions and any programmatic navigation.
export function getVisibleScreenIds(type: BusinessTypeValue): Set<string> {
  const ids = new Set<string>()
  for (const menu of getMenusForBusinessType(type)) {
    for (const child of menu.children) {
      ids.add(child.id)
    }
  }
  return ids
}
