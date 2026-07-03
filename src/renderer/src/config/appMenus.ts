import type { AppMenu } from '../types/menu'

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
      { id: 'cash-fine-opening', label: 'Cash Fine Opening', module: 'master' }
    ]
  },
  {
    id: 'transaction',
    label: 'Transaction',
    children: [
      { id: 'sale', label: 'Sale', module: 'transaction' },
      { id: 'purchase', label: 'Purchase', module: 'transaction' },
      { id: 'cash-payment-nave', label: 'Cash Payment / Nave', module: 'transaction' },
      { id: 'cash-receipt-jama', label: 'Cash Receipt / Jama', module: 'transaction' },
      { id: 'transfer', label: 'Transfer', module: 'transaction' },
      { id: 'weight-scan', label: 'Weight Scan', module: 'transaction' },
      { id: 'sauda-book', label: 'Sauda Book', module: 'transaction' },
      { id: 'order-payal', label: 'Order Payal', module: 'transaction' },
      { id: 'settlement', label: 'Settlement', module: 'transaction' }
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
      { id: 'fine-rojmel', label: 'Fine Rojmel', module: 'reports' },
      { id: 'dar-rojmel', label: 'Dar Rojmel', module: 'reports' },
      { id: 'account-balance', label: 'Account Balance', module: 'reports' },
      { id: 'sale-register', label: 'Sale Register', module: 'reports' },
      { id: 'accountwise-summary', label: 'Accountwise Summary', module: 'reports' },
      { id: 'account-wise-sale-purchase', label: 'Account Wise Sale Purchase', module: 'reports' },
      { id: 'accountwise-details', label: 'Accountwise Details', module: 'reports' },
      { id: 'item-stock', label: 'Item Stock', module: 'reports' },
      { id: 'item-transaction', label: 'Item Transaction', module: 'reports' },
      { id: 'itemwise-sale-purchase', label: 'Itemwise Sale Purchase', module: 'reports' },
      {
        id: 'item-sale-purchase-city-wise',
        label: 'Item Sale Purchase City Wise',
        module: 'reports'
      },
      { id: 'fine-margin', label: 'Fine Margin', module: 'reports' },
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
      { id: 'reminder', label: 'Reminder', module: 'utility' },
      { id: 'screenshot', label: 'Screen Shot', module: 'utility' },
      { id: 'whatsapp', label: 'WhatsApp', module: 'utility' },
      { id: 'printer-setting', label: 'Printer Setting', module: 'utility' },
      { id: 'user-management', label: 'User Management', module: 'utility' },
      { id: 'settings', label: 'Settings', module: 'utility' }
    ]
  }
]
