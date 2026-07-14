import { useCallback, useEffect, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

function ScreenshotScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [screenshots, setScreenshots] = useState<ScreenshotListRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [capturing, setCapturing] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3500)
  }, [])

  const loadScreenshots = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.screenshot.list()
      setScreenshots(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadScreenshots()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadScreenshots])

  const handleCapture = async (): Promise<void> => {
    try {
      setCapturing(true)
      const result = await window.api.screenshot.capture()
      await loadScreenshots()
      showAlert('success', `Screenshot saved: ${result.fileName}`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setCapturing(false)
    }
  }

  const handleOpenFolder = async (): Promise<void> => {
    try {
      await window.api.screenshot.openFolder()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }

  return (
    <div className="account-group-screen screenshot-screen">
      <div className="account-group-window">
        <div className="form-title-bar">
          <span>Screen Shot</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-group-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="button-row">
            <button
              className="btn-save"
              type="button"
              onClick={() => void handleCapture()}
              disabled={capturing}
            >
              {capturing ? 'Capturing...' : 'Take Screenshot'}
            </button>

            <button className="btn-new" type="button" onClick={() => void handleOpenFolder()}>
              Open Folder
            </button>

            <button
              className="btn-new"
              type="button"
              onClick={() => void loadScreenshots()}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          <div className="list-toolbar">
            <div className="record-summary">
              Total Screenshots: <strong>{screenshots.length}</strong>
            </div>
          </div>

          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>File Name</th>
                  <th>Captured At</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="empty-row">
                      Loading screenshots...
                    </td>
                  </tr>
                ) : screenshots.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-row">
                      No screenshots taken yet. Click &quot;Take Screenshot&quot; to capture the
                      current app window.
                    </td>
                  </tr>
                ) : (
                  screenshots.map((shot, index) => (
                    <tr key={shot.filePath}>
                      <td>{index + 1}</td>
                      <td>{shot.fileName}</td>
                      <td>{shot.capturedAt}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text">
            Screenshots are saved as PNG files next to the application data folder. Use &quot;Open
            Folder&quot; to browse them in your file explorer.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScreenshotScreen
