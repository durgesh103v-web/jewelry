import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type TemplateId = 'PAYMENT_REMINDER' | 'BILL_COPY' | 'GENERAL'

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function buildTemplateMessage(
  templateId: TemplateId,
  accountName: string,
  balance: AccountBalanceRecord | null
): string {
  const name = accountName || 'Customer'

  if (templateId === 'PAYMENT_REMINDER') {
    const dueParts: string[] = []

    if (balance) {
      if (Math.abs(balance.goldFine) > 0.001) {
        dueParts.push(`Gold Fine: ${formatNumber(balance.goldFine)} gm`)
      }
      if (Math.abs(balance.silverFine) > 0.001) {
        dueParts.push(`Silver Fine: ${formatNumber(balance.silverFine)} gm`)
      }
      if (Math.abs(balance.cash) > 0.001) {
        dueParts.push(`Cash: Rs. ${formatNumber(balance.cash)}`)
      }
    }

    const dueText = dueParts.length > 0 ? dueParts.join(', ') : 'your outstanding balance'

    return `Dear ${name}, this is a gentle reminder that ${dueText} is due against your account. Please arrange payment at your earliest convenience. Thank you.`
  }

  if (templateId === 'BILL_COPY') {
    return `Dear ${name}, your bill copy is ready. Please visit our shop or reply here to receive it. Thank you for your business.`
  }

  return `Dear ${name}, `
}

function WhatsAppScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [template, setTemplate] = useState<TemplateId>('GENERAL')
  const [message, setMessage] = useState('')
  const [balance, setBalance] = useState<AccountBalanceRecord | null>(null)

  // Loading starts true (rather than being set inside an effect) so the
  // initial fetch never needs a synchronous setState call in the effect body.
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [sending, setSending] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  // Mirrors `template` so the account-balance effect (scoped to
  // [selectedAccountId] only, to avoid re-fetching on every template change)
  // can read the latest template choice without a stale closure.
  const templateRef = useRef(template)

  useEffect(() => {
    templateRef.current = template
  }, [template])

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

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  )

  const resolvedPhone = useMemo(() => {
    if (manualPhone.trim()) return manualPhone.trim()
    return selectedAccount?.whatsappNumber || selectedAccount?.mobileNumber || ''
  }, [manualPhone, selectedAccount])

  useEffect(() => {
    let cancelled = false

    window.api.accounts
      .list()
      .then((data) => {
        if (!cancelled) setAccounts(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoadingAccounts(false)
      })

    return () => {
      cancelled = true

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [showAlert])

  // Loads the balance for the selected account and pre-fills the message
  // template from it. Every state update here happens inside a .then()/
  // .catch() callback (a microtask), never synchronously in the effect body,
  // so switching accounts never overwrites in-progress typing outside of
  // this account-change moment.
  useEffect(() => {
    let cancelled = false

    const accountName = accounts.find((account) => account.id === selectedAccountId)?.accountName || ''

    const balanceRequest = selectedAccountId
      ? window.api.sales.getAccountBalance(selectedAccountId)
      : Promise.resolve(null)

    balanceRequest
      .then((data) => {
        if (cancelled) return
        setBalance(data)
        setMessage(buildTemplateMessage(templateRef.current, accountName, data))
      })
      .catch(() => {
        if (!cancelled) setBalance(null)
      })

    return () => {
      cancelled = true
    }
  }, [selectedAccountId, accounts])

  const applyTemplate = useCallback(
    (templateId: TemplateId): void => {
      setTemplate(templateId)
      setMessage(buildTemplateMessage(templateId, selectedAccount?.accountName || '', balance))
    },
    [selectedAccount, balance]
  )

  const handleSend = async (): Promise<void> => {
    const phone = resolvedPhone.replace(/\D/g, '')

    if (!phone) {
      showAlert('warning', 'Please select an account with a phone number, or enter a phone number.')
      return
    }

    if (!message.trim()) {
      showAlert('warning', 'Please enter a message to send.')
      return
    }

    try {
      setSending(true)
      await window.api.whatsapp.send({ phone: resolvedPhone, message: message.trim() })
      showAlert('success', 'WhatsApp opened in your browser with the message pre-filled.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="account-group-screen whatsapp-screen">
      <div className="account-group-window">
        <div className="form-title-bar">
          <span>WhatsApp Quick Send</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-group-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="form-panel">
            <div className="form-row">
              <label htmlFor="wa-account">Account</label>
              <select
                id="wa-account"
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                disabled={loadingAccounts}
              >
                <option value="">-- Select account (optional) --</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName} {account.mobileNumber ? `(${account.mobileNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="wa-phone">Phone Number</label>
              <input
                id="wa-phone"
                value={manualPhone}
                onChange={(event) => setManualPhone(event.target.value)}
                placeholder={
                  selectedAccount
                    ? `Leave blank to use ${selectedAccount.whatsappNumber || selectedAccount.mobileNumber || 'account number'}`
                    : 'e.g. 9876543210'
                }
              />
            </div>

            <div className="form-row">
              <label htmlFor="wa-template">Message Template</label>
              <select
                id="wa-template"
                value={template}
                onChange={(event) => applyTemplate(event.target.value as TemplateId)}
              >
                <option value="GENERAL">General</option>
                <option value="PAYMENT_REMINDER">Payment Reminder</option>
                <option value="BILL_COPY">Bill Copy Ready</option>
              </select>
            </div>

            {selectedAccount && (
              <div className="form-row">
                <label>Outstanding Balance</label>
                <div className="whatsapp-balance-preview">
                  {balance
                    ? `Gold Fine: ${formatNumber(balance.goldFine)} gm | Silver Fine: ${formatNumber(balance.silverFine)} gm | Cash: Rs. ${formatNumber(balance.cash)}`
                    : 'Loading balance...'}
                </div>
              </div>
            )}

            <div className="form-row">
              <label htmlFor="wa-message">Message</label>
              <textarea
                id="wa-message"
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Type your message..."
              />
            </div>

            <div className="button-row">
              <button
                className="btn-new"
                type="button"
                onClick={() => applyTemplate(template)}
                disabled={sending}
              >
                Reset to Template
              </button>

              <button
                className="btn-save"
                type="button"
                onClick={() => void handleSend()}
                disabled={sending}
              >
                {sending ? 'Opening WhatsApp...' : 'Send via WhatsApp'}
              </button>
            </div>
          </div>

          <div className="screen-help-text">
            This app has no WhatsApp Business API integration. Send opens WhatsApp Web/Desktop (via
            your browser) with the phone number and message pre-filled - you confirm and press send
            there. 10-digit numbers are assumed to be Indian mobile numbers and get a +91 prefix
            automatically.
          </div>
        </div>
      </div>
    </div>
  )
}

export default WhatsAppScreen
