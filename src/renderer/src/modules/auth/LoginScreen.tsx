import { useState, type FormEvent } from 'react'
import { getFriendlyErrorMessage } from '../../utils/getFriendlyErrorMessage'
import { authStyles as s } from './authStyles'

type Props = {
  knownUsername: string | null
  onLoggedIn: (session: AuthSession) => void
}

function LoginScreen({ knownUsername, onLoggedIn }: Props): React.JSX.Element {
  const [username, setUsername] = useState(knownUsername ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('Please enter your username and password.')
      return
    }

    try {
      setSubmitting(true)
      const session = await window.api.auth.login({ username: username.trim(), password })
      onLoggedIn(session)
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
          <h1 style={s.headerTitle}>Jewellery ERP</h1>
          <p style={s.headerSub}>Please log in to continue</p>
        </div>

        <form style={s.body} onSubmit={handleSubmit}>
          {error && <div style={s.error}>{error}</div>}

          <div style={s.field}>
            <label style={s.label} htmlFor="login-username">
              Username
            </label>
            <input
              id="login-username"
              style={s.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              placeholder="Enter username"
            />
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              style={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ ...s.button, background: '#1e63d6', ...(submitting ? s.buttonDisabled : {}) }}
          >
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginScreen
