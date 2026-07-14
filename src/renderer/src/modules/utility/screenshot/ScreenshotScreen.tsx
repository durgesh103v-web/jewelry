import { useCallback, useEffect, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

function ScreenshotScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [screenshots, setScreenshots] = useState<ScreenshotListRecord[]>([])
  const [loading, setLoading] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const [previewShot, setPreviewShot] = useState<ScreenshotListRecord | null>(null)
  const [previewImage, setPreviewImage] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

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

  const handleOpenFolder = async (): Promise<void> => {
    try {
      await window.api.screenshot.openFolder()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }

  const handleView = async (shot: ScreenshotListRecord): Promise<void> => {
    setPreviewShot(shot)
    setPreviewImage('')
    setPreviewLoading(true)

    try {
      const dataUrl = await window.api.screenshot.getImage(shot.fileName)
      setPreviewImage(dataUrl)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
      setPreviewShot(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = (): void => {
    setPreviewShot(null)
    setPreviewImage('')
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

          <div className="screenshot-summary-row">
            <div className="screenshot-summary-card">
              <span>Total Screenshots</span>
              <strong>{screenshots.length}</strong>
            </div>

            <div className="screenshot-hint-card">
              &#128247; Use the camera icon in the top header to capture the screen you&apos;re
              currently on — no need to open this page first.
            </div>

            <div className="screenshot-toolbar-actions">
              <button className="btn-new" type="button" onClick={() => void handleOpenFolder()}>
                Open Folder
              </button>

              <button
                className="btn-new"
                type="button"
                onClick={() => void loadScreenshots()}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="table-panel screenshot-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>File Name</th>
                  <th>Captured At</th>
                  <th className="screenshot-action-col">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      Loading screenshots...
                    </td>
                  </tr>
                ) : screenshots.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      No screenshots yet. Click the &#128247; icon in the top header from any
                      screen to capture one.
                    </td>
                  </tr>
                ) : (
                  screenshots.map((shot, index) => (
                    <tr key={shot.filePath}>
                      <td>{index + 1}</td>
                      <td>{shot.fileName}</td>
                      <td>{shot.capturedAt}</td>
                      <td className="screenshot-action-col">
                        <button
                          className="screenshot-view-btn"
                          type="button"
                          title="View screenshot"
                          aria-label={`View ${shot.fileName}`}
                          onClick={() => void handleView(shot)}
                        >
                          &#128065;
                        </button>
                      </td>
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

      {previewShot && (
        <div className="screenshot-preview-overlay" onClick={closePreview}>
          <div className="screenshot-preview-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="screenshot-preview-toolbar">
              <div className="screenshot-preview-meta">
                <strong>{previewShot.fileName}</strong>
                <span>{previewShot.capturedAt}</span>
              </div>

              <button className="module-close-btn" type="button" onClick={closePreview}>
                &times;
              </button>
            </div>

            <div className="screenshot-preview-body">
              {previewLoading ? (
                <div className="screenshot-preview-loading">Loading preview...</div>
              ) : previewImage ? (
                <img src={previewImage} alt={previewShot.fileName} />
              ) : (
                <div className="screenshot-preview-loading">Unable to load preview.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScreenshotScreen
