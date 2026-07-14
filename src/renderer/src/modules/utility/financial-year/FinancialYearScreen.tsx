import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type FinancialYearForm = {
  yearLabel: string
  startDate: string
  endDate: string
  narration: string
}

const initialForm: FinancialYearForm = {
  yearLabel: '',
  startDate: '',
  endDate: '',
  narration: ''
}

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function FinancialYearScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState<FinancialYearForm>(initialForm)
  const [years, setYears] = useState<FinancialYearRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FinancialYearRecord | null>(null)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')
  const [searchText, setSearchText] = useState('')

  const alertTimerRef = useRef<number | null>(null)
  const yearLabelInputRef = useRef<HTMLInputElement | null>(null)
  const startDateInputRef = useRef<HTMLInputElement | null>(null)
  const endDateInputRef = useRef<HTMLInputElement | null>(null)
  const narrationInputRef = useRef<HTMLInputElement | null>(null)

  const filteredYears = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return years

    return years.filter((year) => {
      return (
        year.yearLabel.toLowerCase().includes(keyword) ||
        year.narration.toLowerCase().includes(keyword)
      )
    })
  }, [years, searchText])

  const currentYear = useMemo(() => years.find((year) => year.isCurrent) ?? null, [years])

  const focusYearLabel = useCallback((): void => {
    window.setTimeout(() => {
      yearLabelInputRef.current?.focus()
    }, 0)
  }, [])

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

  const loadYears = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.financialYears.list()
      setYears(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const handleNew = useCallback((): void => {
    setEditingId(null)
    setAlertMessage('')
    setForm(initialForm)
    focusYearLabel()
  }, [focusYearLabel])

  const focusNextOnEnter = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    nextElement?.focus()
  }

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return

    if (!form.yearLabel.trim()) {
      showAlert('warning', 'Please enter financial year label, e.g. 2025-26.')
      yearLabelInputRef.current?.focus()
      return
    }

    if (!form.startDate || !form.endDate) {
      showAlert('warning', 'Please select start and end date.')
      return
    }

    try {
      setSaving(true)

      const payload = {
        yearLabel: form.yearLabel.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        narration: form.narration.trim()
      }

      const successMessage = editingId
        ? 'Financial year updated successfully.'
        : 'Financial year created successfully.'

      if (editingId) {
        await window.api.financialYears.update(editingId, payload)
      } else {
        await window.api.financialYears.create(payload)
      }

      setEditingId(null)
      setForm(initialForm)
      await loadYears()
      showAlert('success', successMessage)
      focusYearLabel()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [editingId, focusYearLabel, form, loadYears, saving, showAlert])

  const handleEdit = (year: FinancialYearRecord): void => {
    setEditingId(year.id)
    setAlertMessage('')
    setForm({
      yearLabel: year.yearLabel,
      startDate: year.startDate,
      endDate: year.endDate,
      narration: year.narration
    })
    focusYearLabel()
  }

  const handleSetCurrent = async (year: FinancialYearRecord): Promise<void> => {
    try {
      await window.api.financialYears.setCurrent(year.id)
      await loadYears()
      showAlert('success', `${year.yearLabel} set as current financial year.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }

  const handleToggleClosed = async (year: FinancialYearRecord): Promise<void> => {
    try {
      await window.api.financialYears.toggleClosed(year.id, !year.isClosed)
      await loadYears()
      showAlert(
        'success',
        `${year.yearLabel} ${year.isClosed ? 'reopened' : 'closed'} successfully.`
      )
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }

  const requestDelete = (year: FinancialYearRecord): void => {
    setDeleteTarget(year)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      await window.api.financialYears.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        setEditingId(null)
        setForm(initialForm)
      }

      setDeleteTarget(null)
      await loadYears()
      showAlert('success', 'Financial year deleted successfully.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDelete = useCallback((): void => {
    if (deleting) return
    setDeleteTarget(null)
  }, [deleting])

  useEffect(() => {
    let cancelled = false

    window.api.financialYears
      .list()
      .then((data) => {
        if (!cancelled) setYears(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    focusYearLabel()

    return () => {
      cancelled = true

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [focusYearLabel, showAlert])

  return (
    <div className="account-group-screen financial-year-screen">
      <div className="account-group-window">
        <div className="form-title-bar">
          <span>Financial Year</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-group-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="cash-voucher-no-box">
            <span>Current Financial Year</span>
            <strong>{currentYear ? currentYear.yearLabel : 'Not set'}</strong>
          </div>

          <div className="form-panel">
            <div className="form-row">
              <label htmlFor="fy-label">Year Label</label>

              <input
                id="fy-label"
                ref={yearLabelInputRef}
                value={form.yearLabel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, yearLabel: event.target.value }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, startDateInputRef.current)}
                placeholder="e.g. 2025-26"
              />
            </div>

            <div className="form-row">
              <label htmlFor="fy-start-date">Start Date</label>

              <input
                id="fy-start-date"
                ref={startDateInputRef}
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startDate: event.target.value }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, endDateInputRef.current)}
              />
            </div>

            <div className="form-row">
              <label htmlFor="fy-end-date">End Date</label>

              <input
                id="fy-end-date"
                ref={endDateInputRef}
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endDate: event.target.value }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, narrationInputRef.current)}
              />
            </div>

            <div className="form-row">
              <label htmlFor="fy-narration">Narration</label>

              <input
                id="fy-narration"
                ref={narrationInputRef}
                value={form.narration}
                onChange={(event) =>
                  setForm((current) => ({ ...current, narration: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleSave()
                  }
                }}
                placeholder="Optional note"
              />
            </div>

            <div className="button-row">
              <button className="btn-new" type="button" onClick={handleNew} disabled={saving}>
                New
              </button>

              <button
                className="btn-save"
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
              </button>

              {editingId && (
                <button
                  className="btn-cancel-edit"
                  type="button"
                  onClick={handleNew}
                  disabled={saving}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <div className="list-toolbar">
            <div className="list-search">
              <label htmlFor="fy-search">Search</label>
              <input
                id="fy-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by year label"
              />
              {searchText && (
                <button
                  className="search-clear-btn"
                  type="button"
                  onClick={() => setSearchText('')}
                >
                  &times;
                </button>
              )}
            </div>

            <div className="record-summary">
              Total: <strong>{years.length}</strong> | Showing:{' '}
              <strong>{filteredYears.length}</strong>
            </div>
          </div>

          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Year</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      Loading financial years...
                    </td>
                  </tr>
                ) : filteredYears.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      {searchText
                        ? 'No matching financial year found.'
                        : 'No financial year added yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredYears.map((year, index) => (
                    <tr
                      key={year.id}
                      className={editingId === year.id ? 'selected-row' : ''}
                      onDoubleClick={() => handleEdit(year)}
                    >
                      <td>{index + 1}</td>
                      <td>{year.yearLabel}</td>
                      <td>{formatDate(year.startDate)}</td>
                      <td>{formatDate(year.endDate)}</td>
                      <td>
                        {year.isCurrent && <span className="approval-badge approved">Current</span>}{' '}
                        {year.isClosed && <span className="approval-badge cancelled">Closed</span>}
                        {!year.isCurrent && !year.isClosed && (
                          <span className="approval-badge pending">Open</span>
                        )}
                      </td>
                      <td>
                        <button className="table-edit" type="button" onClick={() => handleEdit(year)}>
                          Edit
                        </button>

                        {!year.isCurrent && !year.isClosed && (
                          <button
                            className="table-edit"
                            type="button"
                            onClick={() => void handleSetCurrent(year)}
                          >
                            Set Current
                          </button>
                        )}

                        <button
                          className="table-edit"
                          type="button"
                          onClick={() => void handleToggleClosed(year)}
                        >
                          {year.isClosed ? 'Reopen' : 'Close'}
                        </button>

                        {!year.isCurrent && (
                          <button
                            className="table-delete"
                            type="button"
                            onClick={() => requestDelete(year)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text">
            Tip: Only one financial year can be current at a time. The current year cannot be
            closed or deleted directly — set another year as current first.
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Financial Year?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.yearLabel}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

export default FinancialYearScreen
