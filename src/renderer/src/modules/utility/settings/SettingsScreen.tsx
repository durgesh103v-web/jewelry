import type { AppMenuChild } from '../../../types/menu'

type SettingsTileDefinition = {
  id: string
  label: string
  description: string
  icon: string
}

const settingsTiles: SettingsTileDefinition[] = [
  {
    id: 'firm-master',
    label: 'Firm Master',
    description: 'Firm name, address, GST/PAN and other firm-level details.',
    icon: '\u{1F3E2}'
  },
  {
    id: 'printer-setting',
    label: 'Printer Setting',
    description: 'Configure bill/barcode printer and print layout options.',
    icon: '\u{1F5A8}\u{FE0F}'
  },
  {
    id: 'backup',
    label: 'Backup & Restore',
    description: 'Create a database backup or restore from an existing one.',
    icon: '\u{1F4BE}'
  },
  {
    id: 'user-management',
    label: 'User Management',
    description: 'Manage application users, roles and access.',
    icon: '\u{1F464}'
  },
  {
    id: 'financial-year',
    label: 'Financial Year',
    description: 'Manage financial years, set current year, open/close a year.',
    icon: '\u{1F4C5}'
  }
]

function SettingsScreen({
  onClose,
  onNavigate
}: {
  onClose: () => void
  onNavigate: (id: string, label: string, module: AppMenuChild['module']) => void
}): React.JSX.Element {
  return (
    <div className="account-group-screen settings-screen">
      <div className="account-group-window settings-window">
        <div className="form-title-bar">
          <span>Settings</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-group-body">
          <p className="settings-intro">
            Quick access to firm and application settings. Click a tile to open it in a new tab.
          </p>

          <div className="settings-hub-grid">
            {settingsTiles.map((tile) => (
              <button
                key={tile.id}
                className="settings-tile"
                type="button"
                onClick={() => onNavigate(tile.id, tile.label, 'utility')}
              >
                <span className="settings-tile-icon">{tile.icon}</span>
                <strong>{tile.label}</strong>
                <small>{tile.description}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsScreen
