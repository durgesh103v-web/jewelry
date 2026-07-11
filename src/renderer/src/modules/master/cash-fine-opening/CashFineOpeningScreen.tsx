import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver'

type LineForm = {
  metalType: MetalType
  entryType: string
  details: string
  weight: string
  tanch: string
  ptStatus: string
}

type OpeningLine = {
  lineNo: number
  metalType: MetalType
  entryType: string
  details: string
  weight: number
  tanch: number
  fine: number
  ptStatus: string
}

const initialLineForm: LineForm = {
  metalType: 'Silver',
  entryType: '',
  details: '',
  weight: '',
  tanch: '',
  ptStatus: ''
}

const initialSummaryForm = {
  goldPurchaseFine: '',
  goldPurchaseAmount: '',
  goldSaleFine: '',
  goldSaleAmount: '',
  silverPurchaseFine: '',
  silverPurchaseAmount: '',
  silverSaleFine: '',
  silverSaleAmount: '',
  openingCash: ''
}

function toNumber(value: string | number): number {
  if (value === '') return 0

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function isValidAmountInput(value: string): boolean {
  return /^-?\d*\.?\d*$/.test(value)
}

function roundNumber(value: number, decimals = 3): number {
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function calculateFine(weight: number, tanch: number): number {
  return roundNumber((weight * tanch) / 100)
}

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function numberToInput(value: number): string {
  return Number(value || 0) === 0 ? '' : String(value)
}

function CashFineOpeningScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [lineForm, setLineForm] = useState<LineForm>(initialLineForm)
  const [summaryForm, setSummaryForm] = useState(initialSummaryForm)
  const [lines, setLines] = useState<OpeningLine[]>([])
  const [selectedLineNo, setSelectedLineNo] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')
  const alertTimerRef = useRef<number | null>(null)

  const lineFine = useMemo(() => {
    return calculateFine(toNumber(lineForm.weight), toNumber(lineForm.tanch))
  }, [lineForm.weight, lineForm.tanch])

  const totals = useMemo(() => {
    return lines.reduce(
      (total, line) => {
        if (line.metalType === 'Gold') {
          total.goldWeight += Number(line.weight || 0)
          total.goldFine += Number(line.fine || 0)
        }

        if (line.metalType === 'Silver') {
          total.silverWeight += Number(line.weight || 0)
          total.silverFine += Number(line.fine || 0)
        }

        return total
      },
      { goldWeight: 0, goldFine: 0, silverWeight: 0, silverFine: 0 }
    )
  }, [lines])

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

  const updateLineForm = (field: keyof LineForm, value: string): void => {
    setLineForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const updateLineAmount = (field: 'weight' | 'tanch', value: string): void => {
    if (!isValidAmountInput(value)) return
    updateLineForm(field, value)
  }

  const updateSummary = (field: keyof typeof initialSummaryForm, value: string): void => {
    if (!isValidAmountInput(value)) return

    setSummaryForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const loadOpening = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.cashFineOpening.get()

      setLines(
        data.lines.map((line) => ({
          lineNo: line.lineNo,
          metalType: line.metalType,
          entryType: line.entryType || '',
          details: line.details || '',
          weight: Number(line.weight || 0),
          tanch: Number(line.tanch || 0),
          fine: Number(line.fine || 0),
          ptStatus: line.ptStatus || ''
        }))
      )

      setSummaryForm({
        goldPurchaseFine: numberToInput(data.summary.goldPurchaseFine),
        goldPurchaseAmount: numberToInput(data.summary.goldPurchaseAmount),
        goldSaleFine: numberToInput(data.summary.goldSaleFine),
        goldSaleAmount: numberToInput(data.summary.goldSaleAmount),
        silverPurchaseFine: numberToInput(data.summary.silverPurchaseFine),
        silverPurchaseAmount: numberToInput(data.summary.silverPurchaseAmount),
        silverSaleFine: numberToInput(data.summary.silverSaleFine),
        silverSaleAmount: numberToInput(data.summary.silverSaleAmount),
        openingCash: numberToInput(data.summary.openingCash)
      })

      setSelectedLineNo(null)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const addLine = (): void => {
    if (!lineForm.entryType.trim()) {
      showAlert('warning', 'Please select type.')
      return
    }

    if (toNumber(lineForm.weight) <= 0) {
      showAlert('warning', 'Please enter weight.')
      return
    }

    if (toNumber(lineForm.tanch) <= 0) {
      showAlert('warning', 'Please enter tanch.')
      return
    }

    setLines((current) => [
      ...current,
      {
        lineNo: current.length + 1,
        metalType: lineForm.metalType,
        entryType: lineForm.entryType,
        details: lineForm.details.trim(),
        weight: toNumber(lineForm.weight),
        tanch: toNumber(lineForm.tanch),
        fine: lineFine,
        ptStatus: lineForm.ptStatus
      }
    ])

    setLineForm((current) => ({
      ...initialLineForm,
      metalType: current.metalType
    }))
  }

  const removeSelectedLine = (): void => {
    if (!selectedLineNo) {
      showAlert('warning', 'Please select line to remove.')
      return
    }

    setLines((current) =>
      current
        .filter((line) => line.lineNo !== selectedLineNo)
        .map((line, index) => ({ ...line, lineNo: index + 1 }))
    )
    setSelectedLineNo(null)
  }

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true)

      await window.api.cashFineOpening.save({
        lines: lines.map((line) => ({
          metalType: line.metalType,
          entryType: line.entryType,
          details: line.details,
          weight: line.weight,
          tanch: line.tanch,
          ptStatus: line.ptStatus
        })),
        summary: {
          goldPurchaseFine: toNumber(summaryForm.goldPurchaseFine),
          goldPurchaseAmount: toNumber(summaryForm.goldPurchaseAmount),
          goldSaleFine: toNumber(summaryForm.goldSaleFine),
          goldSaleAmount: toNumber(summaryForm.goldSaleAmount),
          silverPurchaseFine: toNumber(summaryForm.silverPurchaseFine),
          silverPurchaseAmount: toNumber(summaryForm.silverPurchaseAmount),
          silverSaleFine: toNumber(summaryForm.silverSaleFine),
          silverSaleAmount: toNumber(summaryForm.silverSaleAmount),
          openingCash: toNumber(summaryForm.openingCash)
        }
      })

      showAlert('success', 'Cash Fine Opening saved successfully.')
      await loadOpening()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadOpening()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadOpening])

  return (
    <div className="cash-fine-opening-screen">
      <div className="cash-fine-opening-window">
        <div className="form-title-bar">
          <span>Cash Fine Opening</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="cash-fine-opening-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="cash-fine-entry-panel">
            <div className="cash-fine-entry-grid">
              <div className="form-field">
                <label>Gold / Silver</label>
                <select
                  value={lineForm.metalType}
                  onChange={(event) => updateLineForm('metalType', event.target.value as MetalType)}
                >
                  <option value="Gold">GOLD</option>
                  <option value="Silver">SILVER</option>
                </select>
              </div>

              <div className="form-field">
                <label>Type</label>
                <select
                  value={lineForm.entryType}
                  onChange={(event) => updateLineForm('entryType', event.target.value)}
                >
                  <option value="">Select</option>
                  <option value="Purchase">Purchase</option>
                  <option value="Sale">Sale</option>
                  <option value="Receipt">Receipt</option>
                  <option value="Payment">Payment</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field">
                <label>Details</label>
                <input
                  value={lineForm.details}
                  onChange={(event) => updateLineForm('details', event.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Wt.</label>
                <input
                  value={lineForm.weight}
                  onChange={(event) => updateLineAmount('weight', event.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Tanch</label>
                <input
                  value={lineForm.tanch}
                  onChange={(event) => updateLineAmount('tanch', event.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Fine</label>
                <input value={formatNumber(lineFine)} readOnly />
              </div>

              <div className="form-field">
                <label>Pt St</label>
                <select
                  value={lineForm.ptStatus}
                  onChange={(event) => updateLineForm('ptStatus', event.target.value)}
                >
                  <option value="">None</option>
                  <option value="Pending">Pending</option>
                  <option value="Clear">Clear</option>
                </select>
              </div>

              <button className="cash-fine-add-btn" type="button" onClick={addLine}>
                Add
              </button>

              <button className="cash-fine-remove-btn" type="button" onClick={removeSelectedLine}>
                Remove
              </button>
            </div>
          </div>

          <div className="table-panel cash-fine-lines-table">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Gold/Silver</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Weight</th>
                  <th>Tanch</th>
                  <th>Fine</th>
                  <th>Pt St</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="empty-row">
                      Loading cash fine opening...
                    </td>
                  </tr>
                ) : lines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-row">
                      No cash fine opening line added yet.
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr
                      key={line.lineNo}
                      className={selectedLineNo === line.lineNo ? 'selected-row' : ''}
                      onClick={() => setSelectedLineNo(line.lineNo)}
                    >
                      <td>{line.lineNo}</td>
                      <td>{line.metalType.toUpperCase()}</td>
                      <td>{line.entryType}</td>
                      <td>{line.details || '-'}</td>
                      <td>{formatNumber(line.weight)}</td>
                      <td>{formatNumber(line.tanch)}</td>
                      <td>{formatNumber(line.fine)}</td>
                      <td>{line.ptStatus || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="cash-fine-bottom-grid">
            <div className="cash-fine-summary-box">
              <div className="cash-fine-box-title">Enter Gold Purchase Details</div>
              <div className="cash-fine-two-col">
                <div className="form-field">
                  <label>Fine</label>
                  <input
                    value={summaryForm.goldPurchaseFine}
                    onChange={(event) => updateSummary('goldPurchaseFine', event.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Amount</label>
                  <input
                    value={summaryForm.goldPurchaseAmount}
                    onChange={(event) => updateSummary('goldPurchaseAmount', event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="cash-fine-summary-box">
              <div className="cash-fine-box-title">Enter Gold Sale Details</div>
              <div className="cash-fine-two-col">
                <div className="form-field">
                  <label>Fine</label>
                  <input
                    value={summaryForm.goldSaleFine}
                    onChange={(event) => updateSummary('goldSaleFine', event.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Amount</label>
                  <input
                    value={summaryForm.goldSaleAmount}
                    onChange={(event) => updateSummary('goldSaleAmount', event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="cash-fine-summary-box opening-cash-box">
              <div className="cash-fine-box-title">Opening Cash</div>
              <div className="form-field">
                <label>Amount</label>
                <input
                  value={summaryForm.openingCash}
                  onChange={(event) => updateSummary('openingCash', event.target.value)}
                />
              </div>
            </div>

            <div className="cash-fine-summary-box">
              <div className="cash-fine-box-title">Enter Silver Purchase Details</div>
              <div className="cash-fine-two-col">
                <div className="form-field">
                  <label>Fine</label>
                  <input
                    value={summaryForm.silverPurchaseFine}
                    onChange={(event) => updateSummary('silverPurchaseFine', event.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Amount</label>
                  <input
                    value={summaryForm.silverPurchaseAmount}
                    onChange={(event) => updateSummary('silverPurchaseAmount', event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="cash-fine-summary-box">
              <div className="cash-fine-box-title">Enter Silver Sale Details</div>
              <div className="cash-fine-two-col">
                <div className="form-field">
                  <label>Fine</label>
                  <input
                    value={summaryForm.silverSaleFine}
                    onChange={(event) => updateSummary('silverSaleFine', event.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Amount</label>
                  <input
                    value={summaryForm.silverSaleAmount}
                    onChange={(event) => updateSummary('silverSaleAmount', event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="cash-fine-total-row">
            <div>
              <span>Gold Wt.</span>
              <strong>{formatNumber(totals.goldWeight)}</strong>
            </div>
            <div>
              <span>Gold Fine</span>
              <strong>{formatNumber(totals.goldFine)}</strong>
            </div>
            <div>
              <span>Silver Wt.</span>
              <strong>{formatNumber(totals.silverWeight)}</strong>
            </div>
            <div>
              <span>Silver Fine</span>
              <strong>{formatNumber(totals.silverFine)}</strong>
            </div>
          </div>

          <div className="cash-fine-save-row">
            <button
              className="btn-save"
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              className="btn-cancel-edit"
              type="button"
              onClick={() => void loadOpening()}
              disabled={saving}
            >
              Cancel
            </button>
          </div>

          <div className="screen-help-text">
            Cash Fine Opening is firm-level opening. Opening Cash will be used in Cash Book opening
            balance. Fine lines will be used later in Fine Rojmel / Daily Summary.
          </div>
        </div>
      </div>
    </div>
  )
}

export default CashFineOpeningScreen
