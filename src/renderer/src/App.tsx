import { useState } from 'react'
import './App.css'
import { appMenus } from './config/appMenus'
import AccountGroupScreen from './modules/master/account-group/AccountGroupScreen'
import type { AppMenuChild, WorkspaceTab } from './types/menu'

const dashboardTab: WorkspaceTab = {
  id: 'dashboard',
  label: 'Dashboard',
  module: 'home'
}

function App(): React.JSX.Element {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [tabs, setTabs] = useState<WorkspaceTab[]>([dashboardTab])
  const [activeTabId, setActiveTabId] = useState('dashboard')

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? dashboardTab

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
      <header className="title-strip">
        <div>Jewellery - Code : User : 1 Counter No. : 2 &nbsp; 06/02/2026</div>
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
          <select id="firm-select" className="firm-select">
            <option>Demo</option>
          </select>

          <button className="last-backup" type="button">
            Last Backup -
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
