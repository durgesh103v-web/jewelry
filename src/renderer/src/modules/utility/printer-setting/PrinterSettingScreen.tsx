import { useCallback, useEffect, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type PaperSize = 'A4' | '80MM' | '58MM'
type PrintLayout = 'STANDARD' | 'COMPACT'

type PrinterSettingForm = {
  paperSize: PaperSize
  printLayout: PrintLayout
  printCopies: string
  marginTopMm: string
  marginRightMm: string
  marginBottomMm: string
  marginLeftMm: string
  showFirmHeader: boolean
  showGstPan: boolean
  showTerms: boolean
  showSignature: boolean
  showPaymentSection: boolean
  autoPrintAfterSave: boolean
}

const initialForm: PrinterSettingForm = {
  paperSize: 'A4',
  printLayout: 'STANDARD',
  printCopies: '1',
  marginTopMm: '10',
  marginRightMm: '10',
  marginBottomMm: '10',
  marginLeftMm: '10',
  showFirmHeader: true,
  showGstPan: true,
  showTerms: true,
  showSignature: true,
  showPaymentSection: true,
  autoPrintAfterSave: false
}

function toNumber(value: string | number): number {
  if (value === '') return 0

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function isValidAmountInput(value: string): boolean {
  return /^\d*\.?\d*$/.test(value)
}

function isValidIntegerInput(value: string): boolean {
  return /^\d*$/.test(value)
}

function PrinterSettingScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState<PrinterSettingForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const paperSizeRef = useRef<HTMLSelectElement | null>(null)

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3000)
  }, [])

  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.printerSetting.get()

      setForm({
        paperSize: data.paperSize,
        printLayout: data.printLayout,
        printCopies: String(data.printCopies ?? 1),
        marginTopMm: String(data.marginTopMm ?? 10),
        marginRightMm: String(data.marginRightMm ?? 10),
        marginBottomMm: String(data.marginBottomMm ?? 10),
        marginLeftMm: String(data.marginLeftMm ?? 10),
        showFirmHeader: data.showFirmHeader,
        showGstPan: data.showGstPan,
        showTerms: data.showTerms,
        showSignature: data.showSignature,
        showPaymentSection: data.showPaymentSection,
        autoPrintAfterSave: data.autoPrintAfterSave
      })
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const validateForm = (): boolean => {
    const copies = toNumber(form.printCopies)

    if (copies < 1 || copies > 5) {
      showAlert('warning', 'Print copies must be between 1 and 5.')
      return false
    }

    const margins = [
      toNumber(form.marginTopMm),
      toNumber(form.marginRightMm),
      toNumber(form.marginBottomMm),
      toNumber(form.marginLeftMm)
    ]

    if (margins.some((margin) => margin < 0 || margin > 30)) {
      showAlert('warning', 'Margins must be between 0 and 30 mm.')
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (!validateForm()) return

    try {
      setSaving(true)

      await window.api.printerSetting.save({
        paperSize: form.paperSize,
        printLayout: form.printLayout,
        printCopies: toNumber(form.printCopies),
        marginTopMm: toNumber(form.marginTopMm),
        marginRightMm: toNumber(form.marginRightMm),
        marginBottomMm: toNumber(form.marginBottomMm),
        marginLeftMm: toNumber(form.marginLeftMm),
        showFirmHeader: form.showFirmHeader,
        showGstPan: form.showGstPan,
        showTerms: form.showTerms,
        showSignature: form.showSignature,
        showPaymentSection: form.showPaymentSection,
        autoPrintAfterSave: form.autoPrintAfterSave
      })

      showAlert('success', 'Printer settings saved successfully.')
      await loadSettings()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleDecimalChange = (
    value: string,
    fieldName: 'marginTopMm' | 'marginRightMm' | 'marginBottomMm' | 'marginLeftMm'
  ): void => {
    if (!isValidAmountInput(value)) return

    setForm((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadSettings()
      paperSizeRef.current?.focus()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadSettings])

  return (
    <div className="printer-setting-screen">
      <div className="printer-setting-window">
        <div className="form-title-bar">
          <span>Printer Setting</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="printer-setting-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="printer-setting-layout">
            <div className="printer-setting-left">
              <div className="printer-setting-panel">
                <div className="section-title">Paper / Layout</div>

                <div className="printer-setting-grid">
                  <div className="form-field">
                    <label>Paper Size</label>
                    <select
                      ref={paperSizeRef}
                      value={form.paperSize}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          paperSize: event.target.value as PaperSize
                        }))
                      }
                    >
                      <option value="A4">A4</option>
                      <option value="80MM">80mm Thermal</option>
                      <option value="58MM">58mm Thermal</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Print Layout</label>
                    <select
                      value={form.printLayout}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          printLayout: event.target.value as PrintLayout
                        }))
                      }
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="COMPACT">Compact</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Print Copies</label>
                    <input
                      value={form.printCopies}
                      onChange={(event) => {
                        const { value } = event.target

                        if (isValidIntegerInput(value)) {
                          setForm((current) => ({
                            ...current,
                            printCopies: value
                          }))
                        }
                      }}
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>

              <div className="printer-setting-panel">
                <div className="section-title">Margins</div>

                <div className="printer-setting-grid">
                  <div className="form-field">
                    <label>Top Margin mm</label>
                    <input
                      value={form.marginTopMm}
                      onChange={(event) => handleDecimalChange(event.target.value, 'marginTopMm')}
                      placeholder="10"
                    />
                  </div>

                  <div className="form-field">
                    <label>Right Margin mm</label>
                    <input
                      value={form.marginRightMm}
                      onChange={(event) => handleDecimalChange(event.target.value, 'marginRightMm')}
                      placeholder="10"
                    />
                  </div>

                  <div className="form-field">
                    <label>Bottom Margin mm</label>
                    <input
                      value={form.marginBottomMm}
                      onChange={(event) =>
                        handleDecimalChange(event.target.value, 'marginBottomMm')
                      }
                      placeholder="10"
                    />
                  </div>

                  <div className="form-field">
                    <label>Left Margin mm</label>
                    <input
                      value={form.marginLeftMm}
                      onChange={(event) => handleDecimalChange(event.target.value, 'marginLeftMm')}
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>

              <div className="printer-setting-panel">
                <div className="section-title">Bill Print Options</div>

                <div className="printer-option-grid">
                  <label className="printer-option-row">
                    <input
                      type="checkbox"
                      checked={form.showFirmHeader}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          showFirmHeader: event.target.checked
                        }))
                      }
                    />
                    <span>Show Firm Header</span>
                  </label>

                  <label className="printer-option-row">
                    <input
                      type="checkbox"
                      checked={form.showGstPan}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          showGstPan: event.target.checked
                        }))
                      }
                    />
                    <span>Show GST / PAN</span>
                  </label>

                  <label className="printer-option-row">
                    <input
                      type="checkbox"
                      checked={form.showTerms}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          showTerms: event.target.checked
                        }))
                      }
                    />
                    <span>Show Terms</span>
                  </label>

                  <label className="printer-option-row">
                    <input
                      type="checkbox"
                      checked={form.showSignature}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          showSignature: event.target.checked
                        }))
                      }
                    />
                    <span>Show Signature</span>
                  </label>

                  <label className="printer-option-row">
                    <input
                      type="checkbox"
                      checked={form.showPaymentSection}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          showPaymentSection: event.target.checked
                        }))
                      }
                    />
                    <span>Show Dar / Jama Payment Section</span>
                  </label>

                  <label className="printer-option-row">
                    <input
                      type="checkbox"
                      checked={form.autoPrintAfterSave}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          autoPrintAfterSave: event.target.checked
                        }))
                      }
                    />
                    <span>Auto Print After Save</span>
                  </label>
                </div>
              </div>

              <div className="button-row printer-setting-button-row">
                <button
                  className="btn-save"
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Printer Setting'}
                </button>

                <button
                  className="btn-new"
                  type="button"
                  onClick={() => void loadSettings()}
                  disabled={loading || saving}
                >
                  Reload
                </button>
              </div>
            </div>

            <div className="printer-setting-preview">
              <div className="printer-preview-title">Preview</div>

              <div
                className={`printer-preview-page printer-preview-${form.paperSize.toLowerCase()} printer-preview-${form.printLayout.toLowerCase()}`}
              >
                {form.showFirmHeader && (
                  <div className="printer-preview-firm">
                    <strong>SHREE GANESH JEWELLERS</strong>
                    <span>Shop Address, City, State</span>
                    {form.showGstPan && <span>Mob: 9876543210 | GST: 27ABCDE1234F1Z5</span>}
                  </div>
                )}

                <div className="printer-preview-bill-title">SALE BILL</div>

                <div className="printer-preview-line">
                  <span>Bill No: SL-0001</span>
                  <span>Date: 01/01/2026</span>
                </div>

                <div className="printer-preview-table">
                  <div>Item</div>
                  <div>Fine</div>
                  <div>Majuri</div>
                  <div>Mann Payal</div>
                  <div>58.3</div>
                  <div>77</div>
                </div>

                {form.showPaymentSection && (
                  <div className="printer-preview-payment">Dar/Jama: Fine 58.3 | Cash 77</div>
                )}

                {form.showTerms && (
                  <div className="printer-preview-terms">Terms will show here.</div>
                )}

                {form.showSignature && (
                  <div className="printer-preview-sign">
                    <span>Receiver</span>
                    <span>Authorized</span>
                  </div>
                )}
              </div>

              <div className="printer-preview-note">
                These settings will be applied to sale bill print in the next step.
              </div>
            </div>
          </div>

          <div className="screen-help-text">
            Printer settings control sale bill layout, paper size, margins, sections, and print
            behavior.
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrinterSettingScreen
