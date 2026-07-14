import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function daysLabel(reminder: ReminderRecord): string {
  if (reminder.daysUntil === 0) return 'Due today'
  if (reminder.daysUntil < 0) return `${Math.abs(reminder.daysUntil)} day(s) overdue`
  return `Due in ${reminder.daysUntil} day(s)`
}

function ReminderScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Sale' | 'Approval'>('ALL')
  const [loading, setLoading] = useState(false)

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

  const loadReminders = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.reminder.list()
      setReminders(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadReminders()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadReminders])

  const filteredReminders = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return reminders.filter((reminder) => {
      if (typeFilter !== 'ALL' && reminder.type !== typeFilter) return false

      if (!keyword) return true

      return (
        reminder.billNo.toLowerCase().includes(keyword) ||
        reminder.accountName.toLowerCase().includes(keyword) ||
        reminder.mobileNumber.toLowerCase().includes(keyword)
      )
    })
  }, [reminders, searchText, typeFilter])

  const overdueCount = useMemo(
    () => reminders.filter((reminder) => reminder.isOverdue).length,
    [reminders]
  )

  return (
    <div className="sale-register-screen">
      <div className="sale-register-window">
        <div className="form-title-bar">
          <span>Reminder</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="sale-register-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="sale-register-toolbar">
            <div className="list-search">
              <label htmlFor="reminder-search">Search</label>

              <input
                id="reminder-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill no, account, mobile"
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

            <label htmlFor="reminder-type">Type</label>
            <select
              id="reminder-type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'ALL' | 'Sale' | 'Approval')}
            >
              <option value="ALL">All</option>
              <option value="Sale">Sale</option>
              <option value="Approval">Approval</option>
            </select>

            <button
              className="btn-new"
              type="button"
              onClick={() => void loadReminders()}
              disabled={loading}
            >
              Refresh
            </button>

            <div className="record-summary">
              Total: <strong>{reminders.length}</strong> | Overdue:{' '}
              <strong className="overdue-count">{overdueCount}</strong> | Showing:{' '}
              <strong>{filteredReminders.length}</strong>
            </div>
          </div>

          <div className="table-panel sale-register-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Type</th>
                  <th>Bill No</th>
                  <th>Bill Date</th>
                  <th>Account</th>
                  <th>Phone</th>
                  <th>Reminder Date</th>
                  <th>Status</th>
                  <th>Metal</th>
                  <th>Fine Due</th>
                  <th>Majuri Due</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      Loading reminders...
                    </td>
                  </tr>
                ) : filteredReminders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      {searchText || typeFilter !== 'ALL'
                        ? 'No matching reminder found.'
                        : 'No pending reminders. Set a reminder date on a Sale or Approval bill to see it here.'}
                    </td>
                  </tr>
                ) : (
                  filteredReminders.map((reminder, index) => (
                    <tr key={`${reminder.type}-${reminder.id}`}>
                      <td>{index + 1}</td>
                      <td>{reminder.type}</td>
                      <td>{reminder.billNo}</td>
                      <td>{formatDate(reminder.billDate)}</td>
                      <td>{reminder.accountName}</td>
                      <td>{reminder.mobileNumber || '-'}</td>
                      <td>{formatDate(reminder.reminderDate)}</td>
                      <td>
                        <span
                          className={`approval-badge ${
                            reminder.isOverdue ? 'cancelled' : 'pending'
                          }`}
                        >
                          {daysLabel(reminder)}
                        </span>
                      </td>
                      <td>{reminder.metalType}</td>
                      <td>{formatNumber(reminder.fineAmount)}</td>
                      <td>{formatNumber(reminder.majuriAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text">
            Sorted by reminder date, soonest first. Overdue reminders are highlighted in red.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReminderScreen
