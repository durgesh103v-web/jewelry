import { useEffect, useState } from 'react'
import App from '../../App'
import LoginScreen from './LoginScreen'
import RegisterScreen from './RegisterScreen'
import { authStyles as s } from './authStyles'

type Phase = 'loading' | 'register' | 'login' | 'ready'

// Top-level gate: decides whether to show first-run Register, the Login form,
// or the full application. A fresh app launch always requires a login (the main
// process holds no session until auth:login succeeds).
function AuthGate(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('loading')
  const [knownUsername, setKnownUsername] = useState<string | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    let cancelled = false

    window.api.auth
      .getState()
      .then((state) => {
        if (cancelled) return
        setKnownUsername(state.username)
        setPhase(state.registered ? 'login' : 'register')
      })
      .catch(() => {
        if (!cancelled) setPhase('login')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleAuthenticated = (nextSession: AuthSession): void => {
    setSession(nextSession)
    setKnownUsername(nextSession.username)
    setPhase('ready')
  }

  const handleLogout = (): void => {
    void window.api.auth.logout().finally(() => {
      setSession(null)
      setPhase('login')
    })
  }

  if (phase === 'loading') {
    return (
      <div style={s.screen}>
        <div style={{ color: '#33415c', fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
          Loading...
        </div>
      </div>
    )
  }

  if (phase === 'register') {
    return <RegisterScreen onRegistered={handleAuthenticated} />
  }

  if (phase === 'login' || !session) {
    return <LoginScreen knownUsername={knownUsername} onLoggedIn={handleAuthenticated} />
  }

  return <App session={session} onLogout={handleLogout} />
}

export default AuthGate
