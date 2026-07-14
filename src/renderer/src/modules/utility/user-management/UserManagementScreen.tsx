import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type UserForm = {
  username: string
  password: string
  fullName: string
  role: 'ADMIN' | 'USER'
  active: boolean
}

const initialForm: UserForm = {
  username: '',
  password: '',
  fullName: '',
  role: 'USER',
  active: true
}

function UserManagementScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState<UserForm>(initialForm)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')
  const [searchText, setSearchText] = useState('')

  const alertTimerRef = useRef<number | null>(null)
  const usernameInputRef = useRef<HTMLInputElement | null>(null)
  const passwordInputRef = useRef<HTMLInputElement | null>(null)
  const fullNameInputRef = useRef<HTMLInputElement | null>(null)
  const roleSelectRef = useRef<HTMLSelectElement | null>(null)
  const activeCheckboxRef = useRef<HTMLInputElement | null>(null)

  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return users

    return users.filter((user) => {
      return (
        user.username.toLowerCase().includes(keyword) ||
        user.fullName.toLowerCase().includes(keyword) ||
        user.role.toLowerCase().includes(keyword) ||
        (user.active ? 'yes' : 'no').includes(keyword)
      )
    })
  }, [users, searchText])

  const activeCount = useMemo(() => users.filter((user) => user.active).length, [users])

  const focusUsername = useCallback((): void => {
    window.setTimeout(() => {
      usernameInputRef.current?.focus()
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

  const loadUsers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.users.list()
      setUsers(data)
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
    focusUsername()
  }, [focusUsername])

  const focusNextOnEnter = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    nextElement?.focus()
  }

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return

    if (!form.username.trim()) {
      showAlert('warning', 'Please enter username.')
      usernameInputRef.current?.focus()
      return
    }

    if (!editingId && !form.password.trim()) {
      showAlert('warning', 'Please enter password for a new user.')
      passwordInputRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      const payload = {
        username: form.username.trim(),
        password: form.password.trim(),
        fullName: form.fullName.trim(),
        role: form.role,
        active: form.active
      }

      const successMessage = editingId
        ? 'User updated successfully.'
        : 'User created successfully.'

      if (editingId) {
        await window.api.users.update(editingId, payload)
      } else {
        await window.api.users.create(payload)
      }

      setEditingId(null)
      setForm(initialForm)
      await loadUsers()
      showAlert('success', successMessage)
      focusUsername()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [editingId, focusUsername, form, loadUsers, saving, showAlert])

  const handleEdit = (user: UserRecord): void => {
    setEditingId(user.id)
    setAlertMessage('')
    setForm({
      username: user.username,
      password: '',
      fullName: user.fullName,
      role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
      active: user.active
    })
    focusUsername()
  }

  const requestDelete = (user: UserRecord): void => {
    setDeleteTarget(user)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      await window.api.users.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        setEditingId(null)
        setForm(initialForm)
      }

      setDeleteTarget(null)
      await loadUsers()
      showAlert('success', 'User deleted successfully.')
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

    window.api.users
      .list()
      .then((data) => {
        if (!cancelled) setUsers(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    focusUsername()

    return () => {
      cancelled = true

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [focusUsername, showAlert])

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        handleNew()
      }

      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSave()
      }

      if (event.key === 'Escape') {
        if (deleteTarget) {
          handleCancelDelete()
          return
        }

        if (editingId) {
          handleNew()
        }
      }
    }

    window.addEventListener('keydown', handleKeyboard)

    return () => {
      window.removeEventListener('keydown', handleKeyboard)
    }
  }, [deleteTarget, editingId, handleCancelDelete, handleNew, handleSave])

  return (
    <div className="account-group-screen user-management-screen">
      <div className="account-group-window">
        <div className="form-title-bar">
          <span>User Management</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-group-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="form-panel">
            <div className="form-row">
              <label htmlFor="user-username">Username</label>

              <input
                id="user-username"
                ref={usernameInputRef}
                value={form.username}
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, passwordInputRef.current)}
                placeholder="Enter username"
                autoComplete="off"
              />
            </div>

            <div className="form-row">
              <label htmlFor="user-password">
                {editingId ? 'New Password (leave blank to keep)' : 'Password'}
              </label>

              <input
                id="user-password"
                ref={passwordInputRef}
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, fullNameInputRef.current)}
                placeholder={editingId ? 'Leave blank to keep current password' : 'Enter password'}
                autoComplete="new-password"
              />
            </div>

            <div className="form-row">
              <label htmlFor="user-full-name">Full Name</label>

              <input
                id="user-full-name"
                ref={fullNameInputRef}
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fullName: event.target.value }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, roleSelectRef.current)}
                placeholder="Optional full name"
              />
            </div>

            <div className="form-row">
              <label htmlFor="user-role">Role</label>

              <select
                id="user-role"
                ref={roleSelectRef}
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value === 'ADMIN' ? 'ADMIN' : 'USER'
                  }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, activeCheckboxRef.current)}
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="form-row checkbox-row">
              <label htmlFor="user-active">Active</label>

              <input
                id="user-active"
                ref={activeCheckboxRef}
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({ ...current, active: event.target.checked }))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleSave()
                  }
                }}
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
              <label htmlFor="user-search">Search</label>
              <input
                id="user-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by username, name, role"
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
              Total: <strong>{users.length}</strong> | Active: <strong>{activeCount}</strong> |
              Showing: <strong>{filteredUsers.length}</strong>
            </div>
          </div>

          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      {searchText ? 'No matching user found.' : 'No user added yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className={editingId === user.id ? 'selected-row' : ''}
                      onDoubleClick={() => handleEdit(user)}
                    >
                      <td>{index + 1}</td>
                      <td>{user.username}</td>
                      <td>{user.fullName || '-'}</td>
                      <td>{user.role}</td>
                      <td>
                        <span className={user.active ? 'status-active' : 'status-inactive'}>
                          {user.active ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <button className="table-edit" type="button" onClick={() => handleEdit(user)}>
                          Edit
                        </button>

                        <button
                          className="table-delete"
                          type="button"
                          onClick={() => requestDelete(user)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="screen-help-text">
            Tip: Double-click a row to edit. Leave the password field blank while editing to keep
            the current password. The last active admin user cannot be deleted.
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete User?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.username}"? This action cannot be undone.`
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

export default UserManagementScreen
