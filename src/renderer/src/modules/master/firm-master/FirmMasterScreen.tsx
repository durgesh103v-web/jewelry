import { useCallback, useEffect, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

const initialForm = {
  firmName: '',
  ownerName: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  mobileNumber: '',
  whatsappNumber: '',
  email: '',
  gstNo: '',
  panNo: '',
  billTitle: 'SALE BILL',
  billPrefix: 'SL',
  terms: '',
  active: true
}

function FirmMasterScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const firmNameRef = useRef<HTMLInputElement | null>(null)

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

  const updateField = <K extends keyof typeof initialForm>(
    field: K,
    value: (typeof initialForm)[K]
  ): void => {
    setForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const loadFirm = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)

      const data = await window.api.firm.get()

      setForm({
        firmName: data.firmName || '',
        ownerName: data.ownerName || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        mobileNumber: data.mobileNumber || '',
        whatsappNumber: data.whatsappNumber || '',
        email: data.email || '',
        gstNo: data.gstNo || '',
        panNo: data.panNo || '',
        billTitle: data.billTitle || 'SALE BILL',
        billPrefix: data.billPrefix || 'SL',
        terms: data.terms || '',
        active: Boolean(data.active)
      })
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const handleSave = async (): Promise<void> => {
    if (!form.firmName.trim()) {
      showAlert('warning', 'Please enter firm name.')
      firmNameRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      await window.api.firm.save({
        firmName: form.firmName.trim(),
        ownerName: form.ownerName.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        mobileNumber: form.mobileNumber.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        email: form.email.trim(),
        gstNo: form.gstNo.trim().toUpperCase(),
        panNo: form.panNo.trim().toUpperCase(),
        billTitle: form.billTitle.trim() || 'SALE BILL',
        billPrefix: form.billPrefix.trim().toUpperCase() || 'SL',
        terms: form.terms.trim(),
        active: form.active
      })

      showAlert('success', 'Firm details saved successfully.')
      await loadFirm()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadFirm()
      firmNameRef.current?.focus()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadFirm])

  return (
    <div className="firm-master-screen">
      <div className="firm-master-window">
        <div className="form-title-bar">
          <span>Firm Master</span>

          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="firm-master-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="firm-master-panel">
            <div className="section-title">Firm / Shop Details</div>

            <div className="firm-master-grid">
              <div className="form-field">
                <label htmlFor="firm-name">Firm Name</label>
                <input
                  id="firm-name"
                  ref={firmNameRef}
                  value={form.firmName}
                  onChange={(event) => updateField('firmName', event.target.value)}
                  placeholder="Enter firm name"
                />
              </div>

              <div className="form-field">
                <label htmlFor="firm-owner-name">Owner Name</label>
                <input
                  id="firm-owner-name"
                  value={form.ownerName}
                  onChange={(event) => updateField('ownerName', event.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="firm-mobile-number">Mobile Number</label>
                <input
                  id="firm-mobile-number"
                  value={form.mobileNumber}
                  onChange={(event) => updateField('mobileNumber', event.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="firm-whatsapp-number">WhatsApp Number</label>
                <input
                  id="firm-whatsapp-number"
                  value={form.whatsappNumber}
                  onChange={(event) => updateField('whatsappNumber', event.target.value)}
                />
              </div>

              <div className="form-field firm-address-field">
                <label htmlFor="firm-address">Address</label>
                <textarea
                  id="firm-address"
                  value={form.address}
                  onChange={(event) => updateField('address', event.target.value)}
                  placeholder="Full shop address"
                />
              </div>

              <div className="form-field">
                <label htmlFor="firm-city">City</label>
                <input
                  id="firm-city"
                  value={form.city}
                  onChange={(event) => updateField('city', event.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="firm-state">State</label>
                <input
                  id="firm-state"
                  value={form.state}
                  onChange={(event) => updateField('state', event.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="firm-pincode">Pincode</label>
                <input
                  id="firm-pincode"
                  value={form.pincode}
                  onChange={(event) => updateField('pincode', event.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="firm-email">Email</label>
                <input
                  id="firm-email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="firm-master-panel">
            <div className="section-title">Tax / Bill Settings</div>

            <div className="firm-master-grid">
              <div className="form-field">
                <label htmlFor="firm-gst-no">GST No</label>
                <input
                  id="firm-gst-no"
                  value={form.gstNo}
                  onChange={(event) => updateField('gstNo', event.target.value.toUpperCase())}
                />
              </div>

              <div className="form-field">
                <label htmlFor="firm-pan-no">PAN No</label>
                <input
                  id="firm-pan-no"
                  value={form.panNo}
                  onChange={(event) => updateField('panNo', event.target.value.toUpperCase())}
                />
              </div>

              <div className="form-field">
                <label htmlFor="firm-bill-title">Bill Title</label>
                <input
                  id="firm-bill-title"
                  value={form.billTitle}
                  onChange={(event) => updateField('billTitle', event.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="firm-bill-prefix">Bill Prefix</label>
                <input
                  id="firm-bill-prefix"
                  value={form.billPrefix}
                  onChange={(event) => updateField('billPrefix', event.target.value.toUpperCase())}
                />
              </div>

              <div className="form-field firm-terms-field">
                <label htmlFor="firm-terms">Bill Terms</label>
                <textarea
                  id="firm-terms"
                  value={form.terms}
                  onChange={(event) => updateField('terms', event.target.value)}
                  placeholder="Example: Goods once sold will not be returned."
                />
              </div>

              <div className="form-field active-field">
                <label htmlFor="firm-active">Active</label>
                <input
                  id="firm-active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updateField('active', event.target.checked)}
                />
              </div>
            </div>
          </div>

          <div className="firm-preview-card">
            <div className="firm-preview-title">Bill Header Preview</div>

            <h2>{form.firmName || 'YOUR FIRM NAME'}</h2>

            <p>
              {form.address || 'Shop address'}
              {form.city ? `, ${form.city}` : ''}
              {form.state ? `, ${form.state}` : ''}
              {form.pincode ? ` - ${form.pincode}` : ''}
            </p>

            <div className="firm-preview-line">
              {form.mobileNumber && <span>Mob: {form.mobileNumber}</span>}
              {form.whatsappNumber && <span>WhatsApp: {form.whatsappNumber}</span>}
              {form.gstNo && <span>GST: {form.gstNo}</span>}
              {form.panNo && <span>PAN: {form.panNo}</span>}
            </div>

            <strong>{form.billTitle || 'SALE BILL'}</strong>
          </div>

          <div className="button-row firm-master-button-row">
            <button
              className="btn-save"
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Firm Details'}
            </button>

            <button
              className="btn-new"
              type="button"
              onClick={() => void loadFirm()}
              disabled={loading || saving}
            >
              Reload
            </button>
          </div>

          <div className="screen-help-text">
            Firm details are used in Sale and Purchase print headers.
          </div>
        </div>
      </div>
    </div>
  )
}

export default FirmMasterScreen
