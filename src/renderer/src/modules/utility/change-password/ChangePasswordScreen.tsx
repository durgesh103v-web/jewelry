import { useState, type FormEvent } from 'react'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type Props = {
  onClose: () => void
}

function ChangePasswordScreen({ onClose }: Props): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const resetFields = (): void => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setMessage(null)

    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Please enter your current password.' })
      return
    }
    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'New password must be at least 4 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirm password do not match.' })
      return
    }

    try {
      setSubmitting(true)
      await window.api.auth.changePassword({ currentPassword, newPassword })
      setMessage({ type: 'success', text: 'Password changed successfully.' })
      resetFields()
    } catch (err) {
      setMessage({ type: 'error', text: getFriendlyErrorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 11px',
    fontSize: '14px',
    border: '1px solid #c7d2e0',
    borderRadius: '5px',
    boxSizing: 'border-box'
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#33415c'
  }

  return (
    <div className="account-group-screen">
      <div className="account-group-window">
        <div className="form-title-bar">
          <span>Change Password</span>
          <button type="button" className="module-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-group-body" style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit} style={{ maxWidth: '420px' }}>
          {message && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                background: message.type === 'success' ? '#eaf7ee' : '#fdecec',
                border: `1px solid ${message.type === 'success' ? '#a9dcb8' : '#f4b8b8'}`,
                color: message.type === 'success' ? '#1e7a3d' : '#b42318'
              }}
            >
              {message.text}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle} htmlFor="cp-current">
              Current Password
            </label>
            <input
              id="cp-current"
              type="password"
              style={inputStyle}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle} htmlFor="cp-new">
              New Password
            </label>
            <input
              id="cp-new"
              type="password"
              style={inputStyle}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle} htmlFor="cp-confirm">
              Confirm New Password
            </label>
            <input
              id="cp-confirm"
              type="password"
              style={inputStyle}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 22px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#ffffff',
              background: submitting ? '#8fb8a0' : '#1e8f4e',
              border: 'none',
              borderRadius: '6px',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Saving...' : 'Change Password'}
          </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordScreen
