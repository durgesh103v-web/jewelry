type ConfirmType = 'danger' | 'warning' | 'info'

type AppConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: ConfirmType
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function AppConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false,
  onConfirm,
  onCancel
}: AppConfirmDialogProps): React.JSX.Element | null {
  if (!open) return null

  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <div className={`confirm-icon confirm-icon-${type}`}>{type === 'danger' ? '!' : '?'}</div>

        <div className="confirm-content">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>

        <div className="confirm-actions">
          <button
            className="confirm-cancel-btn"
            type="button"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            className={`confirm-ok-btn confirm-ok-${type}`}
            type="button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AppConfirmDialog
