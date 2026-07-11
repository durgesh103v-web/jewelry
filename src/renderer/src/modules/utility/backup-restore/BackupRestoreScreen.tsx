import { useCallback, useEffect, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

function BackupRestoreScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)

  const alertTimerRef = useRef<number | null>(null)

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 4000)
  }, [])

  const handleCreateBackup = async (): Promise<void> => {
    try {
      setCreatingBackup(true)
      const result = await window.api.backup.create()

      if (result.cancelled) {
        showAlert('warning', result.message || 'Backup cancelled.')
        return
      }

      showAlert('success', result.message || 'Backup created successfully.')
      window.dispatchEvent(new CustomEvent('erp:backup-created'))
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setCreatingBackup(false)
    }
  }

  const handleRestoreBackup = async (): Promise<void> => {
    try {
      setRestoringBackup(true)
      const result = await window.api.backup.restore()

      if (result.cancelled) {
        showAlert('warning', result.message || 'Restore cancelled.')
        return
      }

      showAlert('success', result.message || 'Backup restored successfully.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setRestoringBackup(false)
      setRestoreConfirmOpen(false)
    }
  }

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="backup-restore-screen">
      <div className="backup-restore-window">
        <div className="form-title-bar">
          <span>Backup / Restore</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="backup-restore-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="backup-restore-grid">
            <div className="backup-card backup-create-card">
              <div className="backup-card-icon">DB</div>

              <div className="backup-card-content">
                <h3>Create Backup</h3>
                <p>
                  Save a safe copy of your jewellery ERP database. Use this before closing shop,
                  before restore, or before major changes.
                </p>

                <ul>
                  <li>Accounts</li>
                  <li>Items and stock</li>
                  <li>Sale bills</li>
                  <li>Ledger and reports</li>
                </ul>

                <button
                  className="backup-primary-btn"
                  type="button"
                  onClick={() => void handleCreateBackup()}
                  disabled={creatingBackup || restoringBackup}
                >
                  {creatingBackup ? 'Creating Backup...' : 'Create Backup'}
                </button>
              </div>
            </div>

            <div className="backup-card backup-restore-card">
              <div className="backup-card-icon">RST</div>

              <div className="backup-card-content">
                <h3>Restore Backup</h3>
                <p>
                  Restore data from an old backup file. Current data will be replaced with selected
                  backup data.
                </p>

                <div className="backup-warning-box">
                  Restore will replace current database. Create a fresh backup before restore.
                </div>

                <button
                  className="backup-danger-btn"
                  type="button"
                  onClick={() => setRestoreConfirmOpen(true)}
                  disabled={creatingBackup || restoringBackup}
                >
                  {restoringBackup ? 'Restoring...' : 'Restore Backup'}
                </button>
              </div>
            </div>
          </div>

          <div className="backup-help-panel">
            <h4>Recommended daily habit</h4>
            <p>
              At the end of every day, create one backup and save it in a safe folder or pen drive.
              This protects client data if computer crashes or database file gets damaged.
            </p>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={restoreConfirmOpen}
        title="Restore Backup?"
        message="Current data will be replaced with selected backup file. Please create a fresh backup first. Do you want to continue?"
        confirmText="Restore"
        cancelText="Cancel"
        type="danger"
        loading={restoringBackup}
        onConfirm={() => void handleRestoreBackup()}
        onCancel={() => {
          if (!restoringBackup) {
            setRestoreConfirmOpen(false)
          }
        }}
      />
    </div>
  )
}

export default BackupRestoreScreen
