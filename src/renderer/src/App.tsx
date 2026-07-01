import { useState } from 'react'
import './App.css'

type MenuChild = {
  id: string
  label: string
}

type MenuItem = {
  id: string
  label: string
  children: MenuChild[]
}

const appMenus: MenuItem[] = [
  {
    id: 'master',
    label: 'Master',
    children: [
      { id: 'account-master', label: 'Account Master' },
      { id: 'account-group', label: 'Account Group' },
      { id: 'item-master', label: 'Item Master' },
      { id: 'item-group', label: 'Item Group' },
      { id: 'item-stamp', label: 'Item Stamp' },
      { id: 'item-design', label: 'Item Design' },
      { id: 'item-opening-stock', label: 'Item Opening Stock' },
      { id: 'firm-master', label: 'Firm Master' },
      { id: 'cash-fine-opening', label: 'Cash Fine Opening' }
    ]
  },
  {
    id: 'transaction',
    label: 'Transaction',
    children: [
      { id: 'sale', label: 'Sale' },
      { id: 'purchase', label: 'Purchase' },
      { id: 'cash-payment-nave', label: 'Cash Payment / Nave' },
      { id: 'cash-receipt-jama', label: 'Cash Receipt / Jama' },
      { id: 'transfer', label: 'Transfer' },
      { id: 'weight-scan', label: 'Weight Scan' },
      { id: 'sauda-book', label: 'Sauda Book' },
      { id: 'order-payal', label: 'Order Payal' },
      { id: 'settlement', label: 'Settlement' }
    ]
  },
  {
    id: 'gst-estimate',
    label: 'GST / Estimate',
    children: [
      { id: 'retail-sale-gst', label: 'Retail Sale GST' },
      { id: 'retail-sale-estimate', label: 'Retail Sale Estimate' },
      { id: 'gst-purchase', label: 'GST Purchase' },
      { id: 'gst-sale-register', label: 'GST Sale Register' },
      { id: 'estimate-register', label: 'Estimate Register' }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    children: [
      { id: 'cash-book', label: 'Cash Book' },
      { id: 'bank-transactions', label: 'Bank Transactions' },
      { id: 'daily-summary-report', label: 'Daily Summary Report' },
      { id: 'fine-rojmel', label: 'Fine Rojmel' },
      { id: 'dar-rojmel', label: 'Dar Rojmel' },
      { id: 'account-balance', label: 'Account Balance' },
      { id: 'accountwise-summary', label: 'Accountwise Summary' },
      { id: 'account-wise-sale-purchase', label: 'Account Wise Sale Purchase' },
      { id: 'accountwise-details', label: 'Accountwise Details' },
      { id: 'item-stock', label: 'Item Stock' },
      { id: 'item-transaction', label: 'Item Transaction' },
      { id: 'itemwise-sale-purchase', label: 'Itemwise Sale Purchase' },
      { id: 'item-sale-purchase-city-wise', label: 'Item Sale Purchase City Wise' },
      { id: 'fine-margin', label: 'Fine Margin' },
      { id: 'payment-receipt', label: 'Payment / Receipt' },
      { id: 'delete-sale-bills', label: 'Delete Sale Bills' }
    ]
  },
  {
    id: 'utility',
    label: 'Utility',
    children: [
      { id: 'backup', label: 'Backup' },
      { id: 'restore-backup', label: 'Restore Backup' },
      { id: 'reminder', label: 'Reminder' },
      { id: 'screenshot', label: 'Screen Shot' },
      { id: 'whatsapp', label: 'WhatsApp' },
      { id: 'printer-setting', label: 'Printer Setting' },
      { id: 'user-management', label: 'User Management' },
      { id: 'settings', label: 'Settings' }
    ]
  }
]

function App(): React.JSX.Element {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('Sale')

  const handleMenuClick = (screenName: string): void => {
    setActiveTab(screenName)
    setOpenMenu(null)
  }

  return (
    <div className="app">
      <header className="title-strip">
        <div>Jewellery - Code : User : Counter No. : Date</div>
      </header>

      <div className="top-bar">
        <nav className="menu-bar" aria-label="Application menu">
          {appMenus.map((menu) => (
            <div
              key={menu.id}
              className="menu-item"
              onMouseEnter={() => setOpenMenu(menu.id)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button className="menu-button" type="button">
                {menu.label}
              </button>

              {openMenu === menu.id && (
                <div className="dropdown">
                  {menu.children.map((child) => (
                    <button
                      key={child.id}
                      className="dropdown-item"
                      type="button"
                      onClick={() => handleMenuClick(child.label)}
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
          <select id="firm-select" className="firm-select">
            <option>Demo</option>
          </select>

          <button className="last-backup" type="button">
            Last Backup -
          </button>
          <button className="screen-btn" type="button">
            📷 Screen Shot
          </button>
          <button className="whatsapp-btn" type="button">
            🟢 WhatsApp
          </button>
        </div>
      </div>

      <main className="workspace">
        <div className="quick-row">
          <button className="search-btn" type="button">
            Search
          </button>
          <input className="search-input" aria-label="Search" />

          <button className="tile sale-tile" type="button" onClick={() => setActiveTab('Sale')}>
            <span>🛍️</span>
            <strong>SALE</strong>
            <small>Sale</small>
          </button>

          <button
            className="tile purchase-tile"
            type="button"
            onClick={() => setActiveTab('Purchase')}
          >
            <span>🧾</span>
            <strong>Purchase</strong>
            <small>Purchase</small>
          </button>

          <button className="tile backup-tile" type="button" onClick={() => setActiveTab('Backup')}>
            <span>🗄️</span>
            <strong>Backup</strong>
            <small>Backup</small>
          </button>

          <button
            className="tile reminder-tile"
            type="button"
            onClick={() => setActiveTab('Reminder')}
          >
            <span>🔔</span>
            <strong>Reminder</strong>
            <small>Reminder</small>
          </button>
        </div>

        <section className="logo-card" aria-label="Jewellery ERP logo area">
          <div className="logo-icon">💎</div>
          <h1>JEWELLERY</h1>
          <p>ERP Desktop Software</p>
        </section>
      </main>

      <footer className="bottom-tabs">
        <button className="active-tab" type="button">
          {activeTab}
        </button>
      </footer>
    </div>
  )
}

export default App
