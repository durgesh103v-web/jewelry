import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { amountInWords } from '../../../utils/amountInWords'
import { formatAmount, formatDate, formatQty, formatWeight } from '../../../utils/printFormat'

type SavedSaleHeader = {
  id: string
  sale_no: string
  sale_date: string
  account_name: string
  mobile_number: string
  metal_type: string
  old_gold_fine: number
  old_silver_fine: number
  old_cash: number
  old_anamat: number
  old_bank: number
  item_fine_total: number
  item_majuri_total: number
  payment_fine_jama_total: number
  payment_cash_jama_total: number
  payment_bank_jama_total: number
  payment_anamat_jama_total: number
  closing_gold_fine: number
  closing_silver_fine: number
  closing_cash: number
  closing_anamat: number
  closing_bank: number
  narration: string
}

type SavedSaleItemLine = {
  line_no: number
  item_name_snapshot: string
  pcs: number
  gross_weight: number
  pack_weight: number
  less_weight: number
  net_weight: number
  tunch: number
  wastage: number
  hishob: number
  fine: number
  labour_rate: number
  labour_rate_type: string
  majuri: number
}

type SavedSalePaymentLine = {
  line_no: number
  type: string
  weight: number
  tanch: number
  wastage: number
  hishob: number
  fine: number
  cash: number
  bank: number
  anamat: number
  details: string
}

export type SavedSaleRecord = {
  header: SavedSaleHeader
  itemLines: SavedSaleItemLine[]
  paymentLines: SavedSalePaymentLine[]
}

type SalePrintPreviewProps = {
  sale: SavedSaleRecord
  onClose: () => void
  autoPrintOnOpen?: boolean
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

function SalePrintPreview({
  sale,
  onClose,
  autoPrintOnOpen = false
}: SalePrintPreviewProps): React.JSX.Element {
  const [firm, setFirm] = useState<FirmRecord | null>(null)
  const [printerSetting, setPrinterSetting] = useState<PrinterSettingPayload>(defaultPrinterSetting)
  const [loadedSettings, setLoadedSettings] = useState(false)

  const header = sale.header
  const itemLines = useMemo(() => sale.itemLines || [], [sale.itemLines])
  const paymentLines = sale.paymentLines || []
  const oldFine = header.metal_type === 'Gold' ? header.old_gold_fine : header.old_silver_fine
  const closingFine =
    header.metal_type === 'Gold' ? header.closing_gold_fine : header.closing_silver_fine

  const itemTotals = useMemo(() => {
    return itemLines.reduce(
      (total, line) => {
        total.pcs += Number(line.pcs || 0)
        total.grossWeight += Number(line.gross_weight || 0)
        total.lessWeight += Number(line.less_weight || 0)
        total.netWeight += Number(line.net_weight || 0)
        total.fine += Number(line.fine || 0)
        total.majuri += Number(line.majuri || 0)
        return total
      },
      {
        pcs: 0,
        grossWeight: 0,
        lessWeight: 0,
        netWeight: 0,
        fine: 0,
        majuri: 0
      }
    )
  }, [itemLines])

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
          setPrinterSetting({
            ...defaultPrinterSetting,
            ...printerData
          })
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
    }, 500)

    return () => window.clearTimeout(printTimer)
  }, [autoPrintOnOpen, loadedSettings, printerSetting.autoPrintAfterSave])

  return (
    <div className="print-preview-overlay">
      <div className="print-preview-window">
        <div className="print-preview-toolbar">
          <strong>
            Sale Print Preview - {printerSetting.paperSize} / {printerSetting.printLayout}
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

                <div className="sale-print-title">
                  {firm?.billTitle || 'Tax Invoice / Sale Bill'}
                </div>

                <div className="sale-print-bill-info">
                  <div className="sale-print-party-box">
                    <strong>Bill To</strong>
                    <p>{header.account_name || '-'}</p>
                    <p>Phone: {header.mobile_number || '-'}</p>
                  </div>

                  <div className="sale-print-bill-meta">
                    <p>
                      <strong>Bill No:</strong> {header.sale_no}
                    </p>
                    <p>
                      <strong>Date:</strong> {formatDate(header.sale_date)}
                    </p>
                    <p>
                      <strong>Metal:</strong> {header.metal_type}
                    </p>
                  </div>
                </div>

                <table className="sale-print-table sale-print-item-table">
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
                    {itemLines.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="sale-print-center-cell">
                          No items found.
                        </td>
                      </tr>
                    ) : (
                      itemLines.map((line) => (
                        <tr key={line.line_no}>
                          <td>{line.line_no}</td>
                          <td>{line.item_name_snapshot}</td>
                          <td>{formatQty(line.pcs)}</td>
                          <td>{formatWeight(line.gross_weight)}</td>
                          <td>{formatWeight(line.less_weight)}</td>
                          <td>{formatWeight(line.net_weight)}</td>
                          <td>{formatWeight(line.tunch)}</td>
                          <td>{formatWeight(line.wastage)}</td>
                          <td>{formatWeight(line.hishob)}</td>
                          <td>{formatWeight(line.fine)}</td>
                          <td>
                            {formatAmount(line.labour_rate)} {line.labour_rate_type}
                          </td>
                          <td>{formatAmount(line.majuri)}</td>
                        </tr>
                      ))
                    )}

                    <tr className="print-total-row">
                      <td colSpan={9}>Total</td>
                      <td>{formatWeight(header.item_fine_total || itemTotals.fine)}</td>
                      <td></td>
                      <td>{formatAmount(header.item_majuri_total || itemTotals.majuri)}</td>
                    </tr>
                  </tbody>
                </table>

                {printerSetting.showPaymentSection && (
                  <>
                    <div className="sale-print-payment-title">Dar / Jama Payment</div>

                    <table className="sale-print-table sale-print-payment-table">
                      <thead>
                        <tr>
                          <th>Sr</th>
                          <th>Type</th>
                          <th>Weight</th>
                          <th>Tunch</th>
                          <th>Wstg</th>
                          <th>Hishob</th>
                          <th>Fine Jama</th>
                          <th>Cash Jama</th>
                          <th>Bank Jama</th>
                          <th>Anamat</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paymentLines.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="sale-print-center-cell">
                              No payment added.
                            </td>
                          </tr>
                        ) : (
                          paymentLines.map((line) => (
                            <tr key={line.line_no}>
                              <td>{line.line_no}</td>
                              <td>{line.type}</td>
                              <td>{formatWeight(line.weight)}</td>
                              <td>{formatWeight(line.tanch)}</td>
                              <td>{formatWeight(line.wastage)}</td>
                              <td>{formatWeight(line.hishob)}</td>
                              <td>{formatWeight(line.fine)}</td>
                              <td>{formatAmount(line.cash)}</td>
                              <td>{formatAmount(line.bank)}</td>
                              <td>{formatAmount(line.anamat)}</td>
                            </tr>
                          ))
                        )}

                        <tr className="print-total-row">
                          <td colSpan={6}>Total Jama</td>
                          <td>{formatWeight(header.payment_fine_jama_total)}</td>
                          <td>{formatAmount(header.payment_cash_jama_total)}</td>
                          <td>{formatAmount(header.payment_bank_jama_total)}</td>
                          <td>{formatAmount(header.payment_anamat_jama_total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}

                <div className="sale-print-bottom-grid">
                  <div className="sale-print-amount-words">
                    <strong>Majuri in Words:</strong>
                    <p>{amountInWords(header.item_majuri_total || itemTotals.majuri)}</p>

                    {header.narration && (
                      <div className="sale-print-inline-note">
                        <strong>Narration:</strong> {header.narration}
                      </div>
                    )}
                  </div>

                  <div className="sale-print-total-box">
                    <div>
                      <span>Current Majuri</span>
                      <strong>{formatAmount(header.item_majuri_total)}</strong>
                    </div>
                    <div>
                      <span>Cash Jama</span>
                      <strong>{formatAmount(header.payment_cash_jama_total)}</strong>
                    </div>
                    <div>
                      <span>Bank Jama</span>
                      <strong>{formatAmount(header.payment_bank_jama_total)}</strong>
                    </div>
                    <div className="grand-total">
                      <span>Closing Cash</span>
                      <strong>{formatAmount(header.closing_cash)}</strong>
                    </div>
                  </div>
                </div>

                <div className="sale-print-balance-grid">
                  <div className="sale-print-balance-box">
                    <div className="sale-print-balance-title">Old Balance</div>
                    <BalanceLine
                      label={`${header.metal_type} Fine`}
                      value={oldFine}
                      valueType="weight"
                    />
                    <BalanceLine label="Cash" value={header.old_cash} valueType="amount" />
                    <BalanceLine label="Bank" value={header.old_bank} valueType="amount" />
                    <BalanceLine label="Anamat" value={header.old_anamat} valueType="amount" />
                  </div>

                  <div className="sale-print-balance-box">
                    <div className="sale-print-balance-title">Current Bill</div>
                    <BalanceLine
                      label="Item Fine"
                      value={header.item_fine_total}
                      valueType="weight"
                    />
                    <BalanceLine
                      label="Majuri"
                      value={header.item_majuri_total}
                      valueType="amount"
                    />
                  </div>

                  <div className="sale-print-balance-box">
                    <div className="sale-print-balance-title">Closing Balance</div>
                    <BalanceLine
                      label={`${header.metal_type} Fine`}
                      value={closingFine}
                      valueType="weight"
                    />
                    <BalanceLine label="Cash" value={header.closing_cash} valueType="amount" />
                    <BalanceLine label="Bank" value={header.closing_bank} valueType="amount" />
                    <BalanceLine label="Anamat" value={header.closing_anamat} valueType="amount" />
                  </div>
                </div>

                {printerSetting.showTerms && firm?.terms && (
                  <div className="sale-print-terms">
                    <strong>Terms:</strong> {firm.terms}
                  </div>
                )}

                {printerSetting.showSignature && (
                  <div className="sale-print-sign-row">
                    <div>Customer Signature</div>
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

function BalanceLine({
  label,
  value,
  valueType
}: {
  label: string
  value: number
  valueType: 'amount' | 'weight'
}): React.JSX.Element {
  return (
    <div className="sale-print-balance-line">
      <span>{label}</span>
      <strong>{valueType === 'amount' ? formatAmount(value) : formatWeight(value)}</strong>
    </div>
  )
}

export default SalePrintPreview
