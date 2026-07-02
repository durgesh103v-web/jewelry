import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type ItemStamp = {
  id: string
  stampName: string
  metalType: string
  description: string
  active: boolean
}

const initialForm = {
  stampName: '',
  metalType: 'Silver',
  description: '',
  active: true
}

function ItemStampScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [itemStamps, setItemStamps] = useState<ItemStamp[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ItemStamp | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const stampNameInputRef = useRef<HTMLInputElement | null>(null)
  const metalTypeSelectRef = useRef<HTMLSelectElement | null>(null)
  const descriptionInputRef = useRef<HTMLInputElement | null>(null)
  const activeCheckboxRef = useRef<HTMLInputElement | null>(null)

  const filteredStamps = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return itemStamps

    return itemStamps.filter((stamp) => {
      return (
        stamp.stampName.toLowerCase().includes(keyword) ||
        stamp.metalType.toLowerCase().includes(keyword) ||
        stamp.description.toLowerCase().includes(keyword) ||
        (stamp.active ? 'yes' : 'no').includes(keyword)
      )
    })
  }, [itemStamps, searchText])

  const activeCount = useMemo(() => {
    return itemStamps.filter((stamp) => stamp.active).length
  }, [itemStamps])

  const focusStampName = useCallback((): void => {
    window.setTimeout(() => {
      stampNameInputRef.current?.focus()
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

  const loadItemStamps = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.itemStamps.list()
      setItemStamps(data)
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
    focusStampName()
  }, [focusStampName])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return

    if (!form.stampName.trim()) {
      showAlert('warning', 'Please enter item stamp name.')
      stampNameInputRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      const payload = {
        ...form,
        stampName: form.stampName.trim(),
        description: form.description.trim()
      }

      const successMessage = editingId
        ? 'Item stamp updated successfully.'
        : 'Item stamp saved successfully.'

      if (editingId) {
        await window.api.itemStamps.update(editingId, payload)
      } else {
        await window.api.itemStamps.create(payload)
      }

      await loadItemStamps()
      handleNew()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [editingId, form, handleNew, loadItemStamps, saving, showAlert])

  const handleEdit = (stamp: ItemStamp): void => {
    setEditingId(stamp.id)
    setAlertMessage('')
    setForm({
      stampName: stamp.stampName,
      metalType: stamp.metalType,
      description: stamp.description,
      active: stamp.active
    })
    focusStampName()
  }

  const requestDelete = (stamp: ItemStamp): void => {
    setDeleteTarget(stamp)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      await window.api.itemStamps.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        handleNew()
      }

      setDeleteTarget(null)
      await loadItemStamps()
      showAlert('success', 'Item stamp deleted successfully.')
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

    window.api.itemStamps
      .list()
      .then((data) => {
        if (!cancelled) setItemStamps(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    focusStampName()

    return () => {
      cancelled = true

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [focusStampName, showAlert])

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
    <div className="item-stamp-screen">
      <div className="item-stamp-window">
        <div className="form-title-bar">
          <span>Item Stamp</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="item-stamp-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="form-panel">
            <div className="form-row">
              <label htmlFor="item-stamp-name">Stamp Name</label>

              <input
                id="item-stamp-name"
                ref={stampNameInputRef}
                value={form.stampName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stampName: event.target.value
                  }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, metalTypeSelectRef.current)}
                placeholder="Enter item stamp name"
              />
            </div>

            <div className="form-row">
              <label htmlFor="item-stamp-metal-type">Metal Type</label>

              <select
                id="item-stamp-metal-type"
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
              <label htmlFor="item-stamp-description">Description</label>

              <input
                id="item-stamp-description"
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
              <label htmlFor="item-stamp-active">Active</label>

              <input
                id="item-stamp-active"
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
              <label htmlFor="item-stamp-search">Search</label>

              <input
                id="item-stamp-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by stamp name, metal type"
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
              Total: <strong>{itemStamps.length}</strong> | Active: <strong>{activeCount}</strong> |
              Showing: <strong>{filteredStamps.length}</strong>
            </div>
          </div>

          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Stamp Name</th>
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
                      Loading item stamps...
                    </td>
                  </tr>
                ) : filteredStamps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      {searchText ? 'No matching item stamp found.' : 'No item stamp added yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredStamps.map((stamp, index) => (
                    <tr
                      key={stamp.id}
                      className={editingId === stamp.id ? 'selected-row' : ''}
                      onDoubleClick={() => handleEdit(stamp)}
                    >
                      <td>{index + 1}</td>
                      <td>{stamp.stampName}</td>
                      <td>{stamp.metalType}</td>
                      <td>{stamp.description || '-'}</td>
                      <td>
                        <span className={stamp.active ? 'status-active' : 'status-inactive'}>
                          {stamp.active ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-edit"
                          type="button"
                          onClick={() => handleEdit(stamp)}
                        >
                          Edit
                        </button>

                        <button
                          className="table-delete"
                          type="button"
                          onClick={() => requestDelete(stamp)}
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
        title="Delete Item Stamp?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.stampName}"? This action cannot be undone.`
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

export default ItemStampScreen
