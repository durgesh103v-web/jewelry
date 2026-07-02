import { useEffect, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type AccountGroup = {
  id: string
  groupName: string
  groupType: string
  description: string
  active: boolean
}

const initialForm = {
  groupName: '',
  groupType: 'Customer',
  description: '',
  active: true
}

function AccountGroupScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [groups, setGroups] = useState<AccountGroup[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AccountGroup | null>(null)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const showAlert = (type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [])

  const loadGroups = async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.accountGroups.list()
      setGroups(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    window.api.accountGroups
      .list()
      .then((data) => {
        if (!cancelled) setGroups(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async (): Promise<void> => {
    if (!form.groupName.trim()) {
      showAlert('warning', 'Please enter group name.')
      return
    }

    try {
      setSaving(true)

      const successMessage = editingId
        ? 'Account group updated successfully.'
        : 'Account group saved successfully.'

      if (editingId) {
        await window.api.accountGroups.update(editingId, form)
      } else {
        await window.api.accountGroups.create(form)
      }

      setEditingId(null)
      setForm(initialForm)
      await loadGroups()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (group: AccountGroup): void => {
    setEditingId(group.id)
    setAlertMessage('')
    setForm({
      groupName: group.groupName,
      groupType: group.groupType,
      description: group.description,
      active: group.active
    })
  }

  const requestDelete = (group: AccountGroup): void => {
    setDeleteTarget(group)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      await window.api.accountGroups.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        setEditingId(null)
        setForm(initialForm)
      }

      setDeleteTarget(null)
      await loadGroups()
      showAlert('success', 'Account group deleted successfully.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDelete = (): void => {
    if (deleting) return
    setDeleteTarget(null)
  }

  const handleNew = (): void => {
    setEditingId(null)
    setAlertMessage('')
    setForm(initialForm)
  }

  return (
    <div className="account-group-screen">
      <div className="account-group-window">
        <div className="form-title-bar">
          <span>Account Group</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-group-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="form-panel">
            <div className="form-row">
              <label htmlFor="account-group-name">Group Name</label>

              <input
                id="account-group-name"
                value={form.groupName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    groupName: event.target.value
                  }))
                }
                placeholder="Enter account group name"
              />
            </div>

            <div className="form-row">
              <label htmlFor="account-group-type">Group Type</label>

              <select
                id="account-group-type"
                value={form.groupType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    groupType: event.target.value
                  }))
                }
              >
                <option>Customer</option>
                <option>Supplier</option>
                <option>Karigar</option>
                <option>Cash</option>
                <option>Bank</option>
                <option>Other</option>
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="account-group-description">Description</label>

              <input
                id="account-group-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                placeholder="Optional description"
              />
            </div>

            <div className="form-row checkbox-row">
              <label htmlFor="account-group-active">Active</label>

              <input
                id="account-group-active"
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.target.checked
                  }))
                }
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

          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Group Name</th>
                  <th>Group Type</th>
                  <th>Description</th>
                  <th>Active</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      Loading account groups...
                    </td>
                  </tr>
                ) : groups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      No account group added yet.
                    </td>
                  </tr>
                ) : (
                  groups.map((group, index) => (
                    <tr key={group.id}>
                      <td>{index + 1}</td>
                      <td>{group.groupName}</td>
                      <td>{group.groupType}</td>
                      <td>{group.description || '-'}</td>
                      <td>{group.active ? 'Yes' : 'No'}</td>
                      <td>
                        <button
                          className="table-edit"
                          type="button"
                          onClick={() => handleEdit(group)}
                        >
                          Edit
                        </button>

                        <button
                          className="table-delete"
                          type="button"
                          onClick={() => requestDelete(group)}
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
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Account Group?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.groupName}"? This action cannot be undone.`
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

export default AccountGroupScreen
