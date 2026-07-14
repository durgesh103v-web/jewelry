import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { formatAmount, formatDate, formatQty, formatWeight } from '../../../utils/printFormat'

type EstimatePrintPreviewProps = {
  estimate: SavedEstimateRecord
  onClose: () => void
}

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

function EstimatePrintPreview({ estimate, onClose }: EstimatePrintPreviewProps): React.JSX.Element {
  const [firm, setFirm] = useState<FirmRecord | null>(null)
  const [printerSetting, setPrinterSetting] = useState<PrinterSettingPayload>(defaultPrinterSetting)

  const header = estimate.header
  const itemLines = useMemo(() => estimate.itemLines || [], [estimate.itemLines])

  const itemTotals = useMemo(() => {
    return itemLines.reduce(
      (total, line) => {
        total.pcs += Number(line.pcs || 0)
        total.grossWeight += Number(line.gross_weight || 0)
        total.netWeight += Number(line.net_weight || 0)
        total.fine += Number(line.fine || 0)
        total.majuri += Number(line.majuri || 0)
        return total
      },
      { pcs: 0, grossWeight: 0, netWeight: 0, fine: 0, majuri: 0 }
    )
  }, [itemLines])

  const totalTax = Number(header.cgst_amount || 0) + Number(header.sgst_amount || 0) + Number(header.igst_amount || 0)
  const grandTotal = Number(header.taxable_amount || 0) + totalTax

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
          <strong>Estimate Print Preview - {header.estimate_no}</strong>

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
          <div className="sale-print-copy">
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

              <div className="sale-print-title">Retail Sale Estimate (Quotation)</div>

              <div className="sale-print-bill-info">
                <div className="sale-print-party-box">
                  <strong>Estimate For</strong>
                  <p>{header.account_name || '-'}</p>
                  <p>Phone: {header.mobile_number || '-'}</p>
                </div>

                <div className="sale-print-bill-meta">
                  <p>
                    <strong>Estimate No:</strong> {header.estimate_no}
                  </p>
                  <p>
                    <strong>Date:</strong> {formatDate(header.estimate_date)}
                  </p>
                  <p>
                    <strong>Metal:</strong> {header.metal_type}
                  </p>
                  {header.valid_until && (
                    <p>
                      <strong>Valid Until:</strong> {formatDate(header.valid_until)}
                    </p>
                  )}
                </div>
              </div>

              <table className="sale-print-table sale-print-item-table">
                <thead>
                  <tr>
                    <th>Sr</th>
                    <th>Item</th>
                    <th>HSN</th>
                    <th>Pcs</th>
                    <th>Gr. Wt.</th>
                    <th>Net Wt.</th>
                    <th>Tunch</th>
                    <th>Wstg</th>
                    <th>Fine</th>
                    <th>Majuri</th>
                    <th>GST%</th>
                    <th>Taxable</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>IGST</th>
                  </tr>
                </thead>

                <tbody>
                  {itemLines.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="sale-print-center-cell">
                        No items found.
                      </td>
                    </tr>
                  ) : (
                    itemLines.map((line) => (
                      <tr key={line.id}>
                        <td>{line.line_no}</td>
                        <td>{line.item_name_snapshot}</td>
                        <td>{line.hsn_code || '-'}</td>
                        <td>{formatQty(line.pcs)}</td>
                        <td>{formatWeight(line.gross_weight)}</td>
                        <td>{formatWeight(line.net_weight)}</td>
                        <td>{formatWeight(line.tunch)}</td>
                        <td>{formatWeight(line.wastage)}</td>
                        <td>{formatWeight(line.fine)}</td>
                        <td>{formatAmount(line.majuri)}</td>
                        <td>{formatWeight(line.gst_rate)}</td>
                        <td>{formatAmount(line.taxable_amount)}</td>
                        <td>{formatAmount(line.cgst_amount)}</td>
                        <td>{formatAmount(line.sgst_amount)}</td>
                        <td>{formatAmount(line.igst_amount)}</td>
                      </tr>
                    ))
                  )}

                  <tr className="print-total-row">
                    <td colSpan={3}>Total</td>
                    <td>{formatQty(itemTotals.pcs)}</td>
                    <td>{formatWeight(itemTotals.grossWeight)}</td>
                    <td>{formatWeight(itemTotals.netWeight)}</td>
                    <td></td>
                    <td></td>
                    <td>{formatWeight(itemTotals.fine)}</td>
                    <td>{formatAmount(itemTotals.majuri)}</td>
                    <td></td>
                    <td>{formatAmount(header.taxable_amount)}</td>
                    <td>{formatAmount(header.cgst_amount)}</td>
                    <td>{formatAmount(header.sgst_amount)}</td>
                    <td>{formatAmount(header.igst_amount)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="sale-print-bottom-grid">
                <div className="sale-print-amount-words">
                  <strong>Status:</strong>
                  <p>
                    {header.status === 'OPEN'
                      ? 'Open (not yet converted to a sale)'
                      : header.status === 'CONVERTED'
                        ? 'Converted to Sale'
                        : 'Cancelled'}
                  </p>

                  {header.narration && (
                    <div className="sale-print-inline-note">
                      <strong>Narration:</strong> {header.narration}
                    </div>
                  )}
                </div>

                <div className="sale-print-total-box">
                  <div>
                    <span>Taxable Amount</span>
                    <strong>{formatAmount(header.taxable_amount)}</strong>
                  </div>
                  <div>
                    <span>Total Tax</span>
                    <strong>{formatAmount(totalTax)}</strong>
                  </div>
                  <div>
                    <span>Majuri</span>
                    <strong>{formatAmount(header.item_majuri_total)}</strong>
                  </div>
                  <div className="grand-total">
                    <span>Grand Total (Approx.)</span>
                    <strong>{formatAmount(grandTotal + Number(header.item_majuri_total || 0))}</strong>
                  </div>
                </div>
              </div>

              <div className="sale-print-narration">
                This is a non-binding price estimate only. It does not affect stock or account
                balance until converted into a final Sale bill. Prices are subject to change based
                on the prevailing metal rate on the date of actual sale.
              </div>

              {printerSetting.showSignature && (
                <div className="sale-print-sign-row">
                  <div>Customer Signature</div>
                  <div>Authorized Signature</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EstimatePrintPreview
