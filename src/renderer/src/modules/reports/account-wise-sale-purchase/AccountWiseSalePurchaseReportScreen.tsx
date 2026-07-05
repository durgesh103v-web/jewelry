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

function getTransactionLabel(type: string): string {
  if (type === 'SALE') return 'Sale'
  if (type === 'PURCHASE') return 'Purchase'
  return type
}

function AccountWiseSalePurchaseReportScreen({
  onClose
}: {
  onClose: () => void
}): React.JSX.Element {
  const [records, setRecords] = useState<AccountWiseSalePurchaseRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [metalFilter, setMetalFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [accountFilter, setAccountFilter] = useState('All')
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const accountOptions = useMemo(() => {
    const map = new Map<string, string>()

    records.forEach((record) => {
      map.set(record.accountId, record.accountName)
    })

    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [records])

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return records.filter((record) => {
      const metalMatch = metalFilter === 'All' || record.metalType === metalFilter
      const typeMatch = typeFilter === 'All' || record.transactionType === typeFilter
      const accountMatch = accountFilter === 'All' || record.accountId === accountFilter
      const keywordMatch =
        !keyword ||
        record.billNo.toLowerCase().includes(keyword) ||
        record.accountName.toLowerCase().includes(keyword) ||
        record.mobileNumber.toLowerCase().includes(keyword) ||
        record.city.toLowerCase().includes(keyword) ||
        record.groupName.toLowerCase().includes(keyword) ||
        record.metalType.toLowerCase().includes(keyword) ||
        record.billDate.toLowerCase().includes(keyword)

      return metalMatch && typeMatch && accountMatch && keywordMatch
    })
  }, [records, searchText, metalFilter, typeFilter, accountFilter])

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.fineJama += Number(record.fineJama || 0) + Number(record.paymentFineJama || 0)
        total.fineNave += Number(record.fineNave || 0) + Number(record.paymentFineNave || 0)
        total.cashJama += Number(record.cashJama || 0) + Number(record.paymentCashJama || 0)
        total.cashNave += Number(record.cashNave || 0) + Number(record.paymentCashNave || 0)
        total.bankJama += Number(record.bankJama || 0)
        total.bankNave += Number(record.bankNave || 0)
        total.anamatJama += Number(record.anamatJama || 0)
        total.anamatNave += Number(record.anamatNave || 0)
        return total
      },
      {
        fineJama: 0,
        fineNave: 0,
        cashJama: 0,
        cashNave: 0,
        bankJama: 0,
        bankNave: 0,
        anamatJama: 0,
        anamatNave: 0
      }
    )
  }, [filteredRecords])

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

  const loadReport = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.reports.accountWiseSalePurchase()
      setRecords(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadReport()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadReport])

  return (
    <div className="account-wise-sp-screen">
      <div className="account-wise-sp-window">
        <div className="form-title-bar">
          <span>Account Wise Sale Purchase</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-wise-sp-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="account-wise-sp-toolbar">
            <div className="form-field">
              <label htmlFor="account-wise-sp-account-filter">Account</label>
              <select
                id="account-wise-sp-account-filter"
                value={accountFilter}
                onChange={(event) => setAccountFilter(event.target.value)}
              >
                <option value="All">All Accounts</option>
                {accountOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="account-wise-sp-type-filter">Type</label>
              <select
                id="account-wise-sp-type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="All">All</option>
                <option value="SALE">Sale</option>
                <option value="PURCHASE">Purchase</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="account-wise-sp-metal-filter">Metal</label>
              <select
                id="account-wise-sp-metal-filter"
                value={metalFilter}
                onChange={(event) => setMetalFilter(event.target.value)}
              >
                <option>All</option>
                <option>Gold</option>
                <option>Silver</option>
              </select>
            </div>

            <div className="list-search">
              <label htmlFor="account-wise-sp-search">Search</label>
              <input
                id="account-wise-sp-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill no, account, mobile, city"
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

            <button
              className="btn-new"
              type="button"
              onClick={() => void loadReport()}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          <div className="account-wise-sp-summary">
            <div>
              <span>Fine Jama</span>
              <strong>{formatNumber(totals.fineJama)}</strong>
            </div>
            <div>
              <span>Fine Nave</span>
              <strong>{formatNumber(totals.fineNave)}</strong>
            </div>
            <div>
              <span>Cash Jama</span>
              <strong>{formatNumber(totals.cashJama)}</strong>
            </div>
            <div>
              <span>Cash Nave</span>
              <strong>{formatNumber(totals.cashNave)}</strong>
            </div>
            <div>
              <span>Showing</span>
              <strong>{filteredRecords.length}</strong>
            </div>
          </div>

          <div className="table-panel account-wise-sp-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Date</th>
                  <th>Bill No</th>
                  <th>Type</th>
                  <th>Account</th>
                  <th>Mobile</th>
                  <th>City</th>
                  <th>Metal</th>
                  <th>Fine Jama</th>
                  <th>Fine Nave</th>
                  <th>Pay Fine Jama</th>
                  <th>Pay Fine Nave</th>
                  <th>Cash Jama</th>
                  <th>Cash Nave</th>
                  <th>Pay Cash Jama</th>
                  <th>Pay Cash Nave</th>
                  <th>Bank Jama</th>
                  <th>Bank Nave</th>
                  <th>Anamat Jama</th>
                  <th>Anamat Nave</th>
                  <th>Closing Fine</th>
                  <th>Closing Cash</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={22} className="empty-row">
                      Loading account wise sale purchase...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={22} className="empty-row">
                      {searchText
                        ? 'No matching sale purchase found.'
                        : 'No sale purchase records found yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => {
                    const closingFine =
                      record.metalType === 'Gold'
                        ? record.closingGoldFine
                        : record.closingSilverFine

                    return (
                      <tr key={`${record.transactionType}-${record.id}`}>
                        <td>{index + 1}</td>
                        <td>{formatDate(record.billDate)}</td>
                        <td>{record.billNo}</td>
                        <td>{getTransactionLabel(record.transactionType)}</td>
                        <td>{record.accountName}</td>
                        <td>{record.mobileNumber || '-'}</td>
                        <td>{record.city || '-'}</td>
                        <td>{record.metalType}</td>
                        <td>{formatNumber(record.fineJama)}</td>
                        <td>{formatNumber(record.fineNave)}</td>
                        <td>{formatNumber(record.paymentFineJama)}</td>
                        <td>{formatNumber(record.paymentFineNave)}</td>
                        <td>{formatNumber(record.cashJama)}</td>
                        <td>{formatNumber(record.cashNave)}</td>
                        <td>{formatNumber(record.paymentCashJama)}</td>
                        <td>{formatNumber(record.paymentCashNave)}</td>
                        <td>{formatNumber(record.bankJama)}</td>
                        <td>{formatNumber(record.bankNave)}</td>
                        <td>{formatNumber(record.anamatJama)}</td>
                        <td>{formatNumber(record.anamatNave)}</td>
                        <td>{formatNumber(closingFine)}</td>
                        <td>{formatNumber(record.closingCash)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text">
            Sale item is Nave. Sale payment is Jama. Purchase item is Jama. Purchase payment is
            Nave. This report helps compare sale and purchase account-wise.
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountWiseSalePurchaseReportScreen
