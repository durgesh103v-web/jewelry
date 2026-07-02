import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type ItemDesign = {
  id: string
  designName: string
  metalType: string
  description: string
  active: boolean
}

const initialForm = {
  designName: '',
  metalType: 'Silver',
  description: '',
  active: true
}

function ItemDesignScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [itemDesigns, setItemDesigns] = useState<ItemDesign[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ItemDesign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const designNameInputRef = useRef<HTMLInputElement | null>(null)
  const metalTypeSelectRef = useRef<HTMLSelectElement | null>(null)
  const descriptionInputRef = useRef<HTMLInputElement | null>(null)
  const activeCheckboxRef = useRef<HTMLInputElement | null>(null)

  const filteredDesigns = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return itemDesigns

    return itemDesigns.filter((design) => {
      return (
        design.designName.toLowerCase().includes(keyword) ||
        design.metalType.toLowerCase().includes(keyword) ||
        design.description.toLowerCase().includes(keyword) ||
        (design.active ? 'yes' : 'no').includes(keyword)
      )
    })
  }, [itemDesigns, searchText])

  const activeCount = useMemo(() => {
    return itemDesigns.filter((design) => design.active).length
  }, [itemDesigns])

  const focusDesignName = useCallback((): void => {
    window.setTimeout(() => {
      designNameInputRef.current?.focus()
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

  const loadItemDesigns = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.itemDesigns.list()
      setItemDesigns(data)
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
    focusDesignName()
  }, [focusDesignName])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return

    if (!form.designName.trim()) {
      showAlert('warning', 'Please enter item design name.')
      designNameInputRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      const payload = {
        ...form,
        designName: form.designName.trim(),
        description: form.description.trim()
      }

      const successMessage = editingId
        ? 'Item design updated successfully.'
        : 'Item design saved successfully.'

      if (editingId) {
        await window.api.itemDesigns.update(editingId, payload)
      } else {
        await window.api.itemDesigns.create(payload)
      }

      await loadItemDesigns()
      handleNew()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [editingId, form, handleNew, loadItemDesigns, saving, showAlert])

  const handleEdit = (design: ItemDesign): void => {
    setEditingId(design.id)
    setAlertMessage('')
    setForm({
      designName: design.designName,
      metalType: design.metalType,
      description: design.description,
      active: design.active
    })
    focusDesignName()
  }

  const requestDelete = (design: ItemDesign): void => {
    setDeleteTarget(design)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      await window.api.itemDesigns.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        handleNew()
      }

      setDeleteTarget(null)
      await loadItemDesigns()
      showAlert('success', 'Item design deleted successfully.')
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

    window.api.itemDesigns
      .list()
      .then((data) => {
        if (!cancelled) setItemDesigns(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    focusDesignName()

    return () => {
      cancelled = true

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [focusDesignName, showAlert])

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
    <div className="item-design-screen">
      <div className="item-design-window">
        <div className="form-title-bar">
          <span>Item Design</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="item-design-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="form-panel">
            <div className="form-row">
              <label htmlFor="item-design-name">Design Name</label>

              <input
                id="item-design-name"
                ref={designNameInputRef}
                value={form.designName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    designName: event.target.value
                  }))
                }
                onKeyDown={(event) => focusNextOnEnter(event, metalTypeSelectRef.current)}
                placeholder="Enter item design name"
              />
            </div>

            <div className="form-row">
              <label htmlFor="item-design-metal-type">Metal Type</label>

              <select
                id="item-design-metal-type"
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
              <label htmlFor="item-design-description">Description</label>

              <input
                id="item-design-description"
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
              <label htmlFor="item-design-active">Active</label>

              <input
                id="item-design-active"
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
              <label htmlFor="item-design-search">Search</label>

              <input
                id="item-design-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by design name, metal type"
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
              Total: <strong>{itemDesigns.length}</strong> | Active: <strong>{activeCount}</strong>{' '}
              | Showing: <strong>{filteredDesigns.length}</strong>
            </div>
          </div>

          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Design Name</th>
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
                      Loading item designs...
                    </td>
                  </tr>
                ) : filteredDesigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      {searchText ? 'No matching item design found.' : 'No item design added yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredDesigns.map((design, index) => (
                    <tr
                      key={design.id}
                      className={editingId === design.id ? 'selected-row' : ''}
                      onDoubleClick={() => handleEdit(design)}
                    >
                      <td>{index + 1}</td>
                      <td>{design.designName}</td>
                      <td>{design.metalType}</td>
                      <td>{design.description || '-'}</td>
                      <td>
                        <span className={design.active ? 'status-active' : 'status-inactive'}>
                          {design.active ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-edit"
                          type="button"
                          onClick={() => handleEdit(design)}
                        >
                          Edit
                        </button>

                        <button
                          className="table-delete"
                          type="button"
                          onClick={() => requestDelete(design)}
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
        title="Delete Item Design?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.designName}"? This action cannot be undone.`
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

export default ItemDesignScreen
