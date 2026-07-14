import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { amountInWords } from '../../../utils/amountInWords'
import { formatAmount, formatDate } from '../../../utils/printFormat'

const defaultPrinterSetting: PrinterSettingPayload = {
  paperSize: 'A4',
  printLayout: 'STANDARD',
  printCopies: 1,
  marginTopMm: 10,
  marginRightMm: 10,
  marginBottomMm: 10,
  marginLeftMm: 10,
  showFirmHeader: true,
  showGstPan: true,
  showTerms: true,
  showSignature: true,
  showPaymentSection: true,
  autoPrintAfterSave: false
}

type CashVoucherPrintPreviewProps = {
  voucher: CashVoucherRecord
  onClose: () => void
  autoPrintOnOpen?: boolean
}

function CashVoucherPrintPreview({
  voucher,
  onClose,
  autoPrintOnOpen = false
}: CashVoucherPrintPreviewProps): React.JSX.Element {
  const [firm, setFirm] = useState<FirmRecord | null>(null)
  const [printerSetting, setPrinterSetting] = useState<PrinterSettingPayload>(defaultPrinterSetting)
  const [loadedSettings, setLoadedSettings] = useState(false)

  const isReceipt = voucher.voucherType === 'RECEIPT'
  const titleLabel = isReceipt ? 'Cash Receipt' : 'Cash Payment'
  const partyLabel = isReceipt ? 'Received From' : 'Paid To'

  const copyCount = useMemo(() => {
    const count = Number(printerSetting.printCopies || 1)
    return Math.min(Math.max(count, 1), 5)
  }, [printerSetting.printCopies])

  const pageClassName = [
    'sale-print-page',
    `sale-print-paper-${String(printerSetting.paperSize || 'A4').toLowerCase()}`,
    `sale-print-layout-${String(printerSetting.printLayout || 'STANDARD').toLowerCase()}`
  ].join(' ')

  const pageStyle: CSSProperties = {
    paddingTop: `${printerSetting.marginTopMm ?? 10}mm`,
    paddingRight: `${printerSetting.marginRightMm ?? 10}mm`,
    paddingBottom: `${printerSetting.marginBottomMm ?? 10}mm`,
    paddingLeft: `${printerSetting.marginLeftMm ?? 10}mm`
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const loadPrintData = async (): Promise<void> => {
        try {
          const [firmData, printerData] = await Promise.all([
            window.api.firm.get(),
            window.api.printerSetting.get()
          ])

          setFirm(firmData)
          setPrinterSetting({ ...defaultPrinterSetting, ...printerData })
        } catch {
          setFirm(null)
          setPrinterSetting(defaultPrinterSetting)
        } finally {
          setLoadedSettings(true)
        }
      }

      void loadPrintData()
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [])

  useEffect(() => {
    if (!loadedSettings || !autoPrintOnOpen || !printerSetting.autoPrintAfterSave) return

    const printTimer = window.setTimeout(() => {
      window.print()
    }, 300)

    return () => window.clearTimeout(printTimer)
  }, [autoPrintOnOpen, loadedSettings, printerSetting.autoPrintAfterSave])

  return (
    <div className="print-preview-overlay">
      <div className="print-preview-window">
        <div className="print-preview-toolbar">
          <strong>
            {titleLabel} Print Preview - {printerSetting.paperSize} / {printerSetting.printLayout}
          </strong>
          <div>
            <button className="btn-save" type="button" onClick={() => window.print()}>
              Print
            </button>
            <button className="btn-new" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="print-preview-page-stack">
          {Array.from({ length: copyCount }).map((_, copyIndex) => (
            <div className="sale-print-copy" key={copyIndex}>
              <div className={pageClassName} style={pageStyle}>
                {printerSetting.showFirmHeader && (
                  <div className="sale-print-firm-header">
                    <h1>{firm?.firmName || 'Your Firm Name'}</h1>
                    {(firm?.address || firm?.city || firm?.state || firm?.pincode) && (
                      <p>
                        {firm?.address}
                        {firm?.city ? `, ${firm.city}` : ''}
                        {firm?.state ? `, ${firm.state}` : ''}
                        {firm?.pincode ? ` - ${firm.pincode}` : ''}
                      </p>
                    )}
                    <div className="sale-print-firm-contact">
                      {firm?.mobileNumber && <span>Ph: {firm.mobileNumber}</span>}
                      {firm?.email && <span>{firm.email}</span>}
                      {printerSetting.showGstPan && firm?.gstNo && <span>GST: {firm.gstNo}</span>}
                      {printerSetting.showGstPan && firm?.panNo && <span>PAN: {firm.panNo}</span>}
                    </div>
                  </div>
                )}

                <div className="sale-print-title">
                  <h2>{titleLabel.toUpperCase()}</h2>
                </div>

                <div className="sale-print-bill-info">
                  <div className="sale-print-party-box">
                    <div>
                      <strong>{partyLabel}:</strong> {voucher.accountName}
                    </div>
                    {voucher.narration && (
                      <div>
                        <strong>Narration:</strong> {voucher.narration}
                      </div>
                    )}
                  </div>
                  <div className="sale-print-bill-meta">
                    <div>
                      <strong>Voucher No:</strong> {voucher.voucherNo}
                    </div>
                    <div>
                      <strong>Date:</strong> {formatDate(voucher.voucherDate)}
                    </div>
                  </div>
                </div>

                <table className="sale-print-table sale-print-item-table">
                  <thead>
                    <tr>
                      <th>Sr.</th>
                      <th>Particulars</th>
                      <th>Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>{voucher.narration || `Cash ${isReceipt ? 'received' : 'paid'} - Voucher ${voucher.voucherNo}`}</td>
                      <td>{formatAmount(voucher.amount)}</td>
                    </tr>
                    <tr className="print-total-row">
                      <td colSpan={2}>Total</td>
                      <td>{formatAmount(voucher.amount)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="sale-print-bottom-grid">
                  <div className="sale-print-amount-words">
                    <strong>Amount in Words:</strong> {amountInWords(voucher.amount)}
                  </div>
                  <div className="sale-print-total-box">
                    <div className="sale-print-balance-line">
                      <span>Total {isReceipt ? 'Received' : 'Paid'}</span>
                      <strong>Rs. {formatAmount(voucher.amount)}</strong>
                    </div>
                  </div>
                </div>

                {printerSetting.showSignature && (
                  <div className="sale-print-sign-row">
                    <div>Received/Paid By</div>
                    <div>Authorised Signatory</div>
                  </div>
                )}

                {copyCount > 1 && (
                  <div className="sale-print-copy-label">
                    {copyIndex === 0 ? 'Original' : copyIndex === 1 ? 'Duplicate' : 'Triplicate'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CashVoucherPrintPreview
