import type { CSSProperties } from 'react'

// Shared inline styles for the Register / Login gate so the auth screens are
// fully self-contained and don't depend on the main App stylesheet.
export const authStyles: Record<string, CSSProperties> = {
  screen: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #eef2f7 0%, #dbe4f0 100%)',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    padding: '24px',
    boxSizing: 'border-box'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 12px 40px rgba(15, 40, 90, 0.18)',
    overflow: 'hidden'
  },
  header: {
    background: 'linear-gradient(90deg, #1e63d6 0%, #2f7ce0 100%)',
    color: '#ffffff',
    padding: '20px 24px',
    textAlign: 'center'
  },
  headerTitle: { margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '0.3px' },
  headerSub: { margin: '6px 0 0', fontSize: '13px', opacity: 0.9 },
  body: { padding: '24px' },
  field: { marginBottom: '16px' },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#33415c'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #c7d2e0',
    borderRadius: '6px',
    boxSizing: 'border-box',
    outline: 'none'
  },
  typeRow: { display: 'flex', gap: '12px' },
  typeOption: {
    flex: 1,
    border: '1px solid #c7d2e0',
    borderRadius: '8px',
    padding: '12px',
    cursor: 'pointer',
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: 600,
    color: '#33415c',
    background: '#f7f9fc'
  },
  typeOptionActive: {
    border: '2px solid #1e63d6',
    background: '#e8f0fd',
    color: '#1e63d6'
  },
  typeHint: { margin: '4px 0 0', fontSize: '11px', fontWeight: 400, color: '#6b7893' },
  button: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#ffffff',
    background: '#1e8f4e',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '6px'
  },
  buttonDisabled: { background: '#8fb8a0', cursor: 'not-allowed' },
  error: {
    background: '#fdecec',
    border: '1px solid #f4b8b8',
    color: '#b42318',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '16px'
  },
  footNote: { marginTop: '18px', textAlign: 'center', fontSize: '12px', color: '#6b7893' }
}
