import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type ItemGroup = {
  id: string
  groupName: string
  metalType: string
  description: string
  active: boolean
}

const initialForm = {
  groupName: '',
  metalType: 'Silver',
  description: '',
  active: true
}

function ItemGroupScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ItemGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const groupNameInputRef = useRef<HTMLInputElement | null>(null)
  const metalTypeSelectRef = useRef<HTMLSelectElement | null>(null)
  const descriptionInputRef = useRef<HTMLInputElement | null>(null)
  const activeCheckboxRef = useRef<HTMLInputElement | null>(null)

  const filteredGroups = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return itemGroups

    return itemGroups.filter((group) => {
      return (
        group.groupName.toLowerCase().includes(keyword) ||
        group.metalType.toLowerCase().includes(keyword) ||
        group.description.toLowerCase().includes(keyword) ||
        (group.active ? 'yes' : 'no').includes(keyword)
      )
    })
  }, [itemGroups, searchText])

  const activeCount = useMemo(() => {
    return itemGroups.filter((group) => group.active).length
  }, [itemGroups])

  const focusGroupName = useCallback((): void => {
    window.setTimeout(() => {
      groupNameInputRef.current?.focus()
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

  const focusNextOnEnter = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    nextElement?.focus()
  }

  const loadItemGroups = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.itemGroups.list()
      setItemGroups(data)
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
    focusGroupName()
  }, [focusGroupName])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return

    if (!form.groupName.trim()) {
      showAlert('warning', 'Please enter item group name.')
      groupNameInputRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      const payload = {
        ...form,
        groupName: form.groupName.trim(),
        description: form.description.trim()
      }

      const successMessage = editingId
        ? 'Item group updated successfully.'
        : 'Item group saved successfully.'

      if (editingId) {
        await window.api.itemGroups.update(editingId, payload)
      } else {
        await window.api.itemGroups.create(payload)
      }

      await loadItemGroups()
      handleNew()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [editingId, form, handleNew, loadItemGroups, saving, showAlert])

  const handleEdit = (group: ItemGroup): void => {
    setEditingId(group.id)
    setAlertMessage('')
    setForm({
      groupName: group.groupName,
      metalType: group.metalType,
      description: group.description,
      active: group.active
    })
    focusGroupName()
  }

  const requestDelete = (group: ItemGroup): void => {
    setDeleteTarget(group)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      await window.api.itemGroups.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        handleNew()
      }

      setDeleteTarget(null)
      await loadItemGroups()
      showAlert('success', 'Item group deleted successfully.')
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

    window.api.itemGroups
      .list()
      .then((data) => {
        if (!cancelled) setItemGroups(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    focusGroupName()

    return () => {
      cancelled = true

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [focusGroupName, showAlert])

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
    <div className="item-group-screen">
      <div className="item-group-window">
        <div className="form-title-bar">
          <span>Item Group</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="item-group-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="form-panel">
            <div className="form-row">
              <label htmlFor="item-group-name">Group Name</label>

              <input
                id="item-group-name"
                ref={groupNameInputRef}
                value={form.groupName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    groupName: event.target.value
                  }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, metalTypeSelectRef.current)}
                placeholder="Enter item group name"
              />
            </div>

            <div className="form-row">
              <label htmlFor="item-group-metal-type">Metal Type</label>

              <select
                id="item-group-metal-type"
                ref={metalTypeSelectRef}
                value={form.metalType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    metalType: event.target.value
                  }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, descriptionInputRef.current)}
              >
                <option>Gold</option>
                <option>Silver</option>
                <option>Diamond</option>
                <option>Other</option>
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="item-group-description">Description</label>

              <input
                id="item-group-description"
                ref={descriptionInputRef}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, activeCheckboxRef.current)}
                placeholder="Optional description"
              />
            </div>

            <div className="form-row checkbox-row">
              <label htmlFor="item-group-active">Active</label>

              <input
                id="item-group-active"
                ref={activeCheckboxRef}
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.target.checked
                  }))
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
              <label htmlFor="item-group-search">Search</label>

              <input
                id="item-group-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by group name, metal type"
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
              Total: <strong>{itemGroups.length}</strong> | Active: <strong>{activeCount}</strong> |
              Showing: <strong>{filteredGroups.length}</strong>
            </div>
          </div>

          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Group Name</th>
                  <th>Metal Type</th>
                  <th>Description</th>
                  <th>Active</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      Loading item groups...
                    </td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      {searchText ? 'No matching item group found.' : 'No item group added yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((group, index) => (
                    <tr
                      key={group.id}
                      className={editingId === group.id ? 'selected-row' : ''}
                      onDoubleClick={() => handleEdit(group)}
                    >
                      <td>{index + 1}</td>
                      <td>{group.groupName}</td>
                      <td>{group.metalType}</td>
                      <td>{group.description || '-'}</td>
                      <td>
                        <span className={group.active ? 'status-active' : 'status-inactive'}>
                          {group.active ? 'Yes' : 'No'}
                        </span>
                      </td>
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

          <div className="screen-help-text">
            Tip: Double-click a row to edit. Press Enter to move through the form.
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Item Group?"
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

export default ItemGroupScreen
