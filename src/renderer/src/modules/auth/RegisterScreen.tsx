import { useState, type FormEvent } from 'react'
import { getFriendlyErrorMessage } from '../../utils/getFriendlyErrorMessage'
import { authStyles as s } from './authStyles'

type Props = {
  onRegistered: (session: AuthSession) => void
}

const BUSINESS_TYPES: Array<{ value: BusinessType; title: string; hint: string }> = [
  { value: 'WHOLESALE', title: 'Wholesaler', hint: 'All features (fine, tunch, ledgers, sauda...)' },
  { value: 'RETAIL', title: 'Retailer', hint: 'GST retail billing, estimate, stock, reports' }
]

function RegisterScreen({ onRegistered }: Props): React.JSX.Element {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firmName, setFirmName] = useState('')
  const [businessType, setBusinessType] = useState<BusinessType>('WHOLESALE')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('Please enter a username.')
      return
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Password and confirm password do not match.')
      return
    }
    if (!firmName.trim()) {
      setError('Please enter your shop / firm name.')
      return
    }

    try {
      setSubmitting(true)
      const session = await window.api.auth.register({
        username: username.trim(),
        password,
        firmName: firmName.trim(),
        businessType
      })
      onRegistered(session)
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={s.screen}>
      <div style={s.card}>
        <div style={s.header}>
          <h1 style={s.headerTitle}>Create Your Account</h1>
          <p style={s.headerSub}>One-time setup for this computer</p>
        </div>

        <form style={s.body} onSubmit={handleSubmit}>
          {error && <div style={s.error}>{error}</div>}

          <div style={s.field}>
            <label style={s.label} htmlFor="reg-username">
              Username
            </label>
            <input
              id="reg-username"
              style={s.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              placeholder="Choose a username"
            />
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              style={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 4 characters"
            />
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="reg-confirm">
              Confirm Password
            </label>
            <input
              id="reg-confirm"
              type="password"
              style={s.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="reg-firm">
              Shop / Firm Name
            </label>
            <input
              id="reg-firm"
              style={s.input}
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="e.g. Shree Jewellers"
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Business Type (cannot be changed later)</label>
            <div style={s.typeRow}>
              {BUSINESS_TYPES.map((option) => {
                const active = businessType === option.value
                return (
                  <div
                    key={option.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => setBusinessType(option.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setBusinessType(option.value)
                    }}
                    style={{
                      ...s.typeOption,
                      ...(active ? s.typeOptionActive : {})
                    }}
                  >
                    <div>{option.title}</div>
                    <p style={s.typeHint}>{option.hint}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ ...s.button, ...(submitting ? s.buttonDisabled : {}) }}
          >
            {submitting ? 'Creating...' : 'Create Account'}
          </button>

          <p style={s.footNote}>This account and business type are locked to this installation.</p>
        </form>
      </div>
    </div>
  )
}

export default RegisterScreen
