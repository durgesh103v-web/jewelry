type AlertType = 'success' | 'error' | 'warning'

type AppAlertProps = {
  type: AlertType
  message: string
  onClose: () => void
}

function AppAlert({ type, message, onClose }: AppAlertProps): React.JSX.Element | null {
  if (!message) return null

  return (
    <div className={`app-alert app-alert-${type}`}>
      <span>{message}</span>

      <button type="button" onClick={onClose}>
        &times;
      </button>
    </div>
  )
}

export default AppAlert
