import { useEffect, useMemo, useState, type CSSProperties } from 'react'

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

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatDate(value: string): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function PurchasePrintPreview({
  purchase,
  onClose
}: {
  purchase: SavedPurchaseRecord
  onClose: () => void
}): React.JSX.Element {
  const [firm, setFirm] = useState<FirmRecord | null>(null)
  const [printerSetting, setPrinterSetting] = useState<PrinterSettingPayload>(defaultPrinterSetting)

  const header = purchase.header
  const itemLines = purchase.itemLines || []
  const paymentLines = purchase.paymentLines || []
  const oldFine = header.metal_type === 'Gold' ? header.old_gold_fine : header.old_silver_fine
  const closingFine =
    header.metal_type === 'Gold' ? header.closing_gold_fine : header.closing_silver_fine

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
        }
      }

      void loadPrintData()
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [])

  return (
    <div className="print-preview-overlay">
      <div className="print-preview-window">
        <div className="print-preview-toolbar">
          <strong>
            Purchase Print Preview - {printerSetting.paperSize} / {printerSetting.printLayout}
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
                      {firm?.mobileNumber && <span>Mob: {firm.mobileNumber}</span>}
                      {firm?.whatsappNumber && <span>WhatsApp: {firm.whatsappNumber}</span>}
                      {printerSetting.showGstPan && firm?.gstNo && <span>GST: {firm.gstNo}</span>}
                      {printerSetting.showGstPan && firm?.panNo && <span>PAN: {firm.panNo}</span>}
                    </div>
                  </div>
                )}

                <div className="sale-print-title">PURCHASE BILL</div>
                <div className="sale-print-header">
                  <div>
                    <strong>Bill No:</strong> {header.purchase_no}
                  </div>
                  <div>
                    <strong>Date:</strong> {formatDate(header.purchase_date)}
                  </div>
                  <div>
                    <strong>Supplier:</strong> {header.account_name}
                  </div>
                  <div>
                    <strong>Phone:</strong> {header.mobile_number || '-'}
                  </div>
                  <div>
                    <strong>Metal:</strong> {header.metal_type}
                  </div>
                </div>
                <table className="sale-print-table">
                  <thead>
                    <tr>
                      <th>Sr</th>
                      <th>Item</th>
                      <th>Pcs</th>
                      <th>Gr. Wt.</th>
                      <th>L. Wt.</th>
                      <th>Net Wt.</th>
                      <th>Tunch</th>
                      <th>Wstg</th>
                      <th>Hishob</th>
                      <th>Fine</th>
                      <th>Lab Rate</th>
                      <th>Majuri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemLines.map((line) => (
                      <tr key={line.line_no}>
                        <td>{line.line_no}</td>
                        <td>{line.item_name_snapshot}</td>
                        <td>{formatNumber(line.pcs)}</td>
                        <td>{formatNumber(line.gross_weight)}</td>
                        <td>{formatNumber(line.less_weight)}</td>
                        <td>{formatNumber(line.net_weight)}</td>
                        <td>{formatNumber(line.tunch)}</td>
                        <td>{formatNumber(line.wastage)}</td>
                        <td>{formatNumber(line.hishob)}</td>
                        <td>{formatNumber(line.fine)}</td>
                        <td>
                          {formatNumber(line.labour_rate)} {line.labour_rate_type}
                        </td>
                        <td>{formatNumber(line.majuri)}</td>
                      </tr>
                    ))}
                    <tr className="print-total-row">
                      <td colSpan={9}>Total</td>
                      <td>{formatNumber(header.item_fine_total)}</td>
                      <td></td>
                      <td>{formatNumber(header.item_majuri_total)}</td>
                    </tr>
                  </tbody>
                </table>

                {printerSetting.showPaymentSection && (
                  <>
                    <div className="sale-print-payment-title">Payment Nave</div>
                    <table className="sale-print-table">
                      <thead>
                        <tr>
                          <th>Sr</th>
                          <th>Type</th>
                          <th>Weight</th>
                          <th>Tunch</th>
                          <th>Wstg</th>
                          <th>Hishob</th>
                          <th>Fine Nave</th>
                          <th>Cash Nave</th>
                          <th>Bank Nave</th>
                          <th>Anamat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentLines.length === 0 ? (
                          <tr>
                            <td colSpan={10}>No payment added.</td>
                          </tr>
                        ) : (
                          paymentLines.map((line) => (
                            <tr key={line.line_no}>
                              <td>{line.line_no}</td>
                              <td>{line.type}</td>
                              <td>{formatNumber(line.weight)}</td>
                              <td>{formatNumber(line.tanch)}</td>
                              <td>{formatNumber(line.wastage)}</td>
                              <td>{formatNumber(line.hishob)}</td>
                              <td>{formatNumber(line.fine)}</td>
                              <td>{formatNumber(line.cash)}</td>
                              <td>{formatNumber(line.bank)}</td>
                              <td>{formatNumber(line.anamat)}</td>
                            </tr>
                          ))
                        )}
                        <tr className="print-total-row">
                          <td colSpan={6}>Total Nave</td>
                          <td>{formatNumber(header.payment_fine_nave_total)}</td>
                          <td>{formatNumber(header.payment_cash_nave_total)}</td>
                          <td>{formatNumber(header.payment_bank_nave_total)}</td>
                          <td>{formatNumber(header.payment_anamat_nave_total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}

                <div className="sale-print-balance-grid">
                  <div className="sale-print-balance-box">
                    <div className="sale-print-balance-title">Old Balance</div>
                    <BalanceLine label={`${header.metal_type} Fine`} value={oldFine} />
                    <BalanceLine label="Cash" value={header.old_cash} />
                    <BalanceLine label="Bank" value={header.old_bank} />
                    <BalanceLine label="Anamat" value={header.old_anamat} />
                  </div>
                  <div className="sale-print-balance-box">
                    <div className="sale-print-balance-title">Current Purchase</div>
                    <BalanceLine label="Item Fine Jama" value={header.item_fine_total} />
                    <BalanceLine label="Majuri Jama" value={header.item_majuri_total} />
                  </div>
                  <div className="sale-print-balance-box">
                    <div className="sale-print-balance-title">Closing Balance</div>
                    <BalanceLine label={`${header.metal_type} Fine`} value={closingFine} />
                    <BalanceLine label="Cash" value={header.closing_cash} />
                    <BalanceLine label="Bank" value={header.closing_bank} />
                    <BalanceLine label="Anamat" value={header.closing_anamat} />
                  </div>
                </div>

                {header.narration && (
                  <div className="sale-print-narration">
                    <strong>Narration:</strong> {header.narration}
                  </div>
                )}

                {printerSetting.showTerms && firm?.terms && (
                  <div className="sale-print-terms">
                    <strong>Terms:</strong> {firm.terms}
                  </div>
                )}

                {printerSetting.showSignature && (
                  <div className="sale-print-sign-row">
                    <div>Receiver Signature</div>
                    <div>Authorized Signature</div>
                  </div>
                )}

                {copyCount > 1 && (
                  <div className="sale-print-copy-label">
                    Copy {copyIndex + 1} of {copyCount}
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

function BalanceLine({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="sale-print-balance-line">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  )
}

export default PurchasePrintPreview
