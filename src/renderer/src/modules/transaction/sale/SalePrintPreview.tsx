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

function SalePrintPreview({ sale, onClose }: SalePrintPreviewProps): React.JSX.Element {
  const header = sale.header
  const oldFine = header.metal_type === 'Gold' ? header.old_gold_fine : header.old_silver_fine
  const closingFine =
    header.metal_type === 'Gold' ? header.closing_gold_fine : header.closing_silver_fine

  return (
    <div className="print-preview-overlay">
      <div className="print-preview-window">
        <div className="print-preview-toolbar">
          <strong>Sale Print Preview</strong>

          <div>
            <button className="btn-save" type="button" onClick={() => window.print()}>
              Print
            </button>
            <button className="btn-new" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="sale-print-page">
          <div className="sale-print-title">SALE BILL</div>

          <div className="sale-print-header">
            <div>
              <strong>Bill No:</strong> {header.sale_no}
            </div>
            <div>
              <strong>Date:</strong> {formatDate(header.sale_date)}
            </div>
            <div>
              <strong>Account:</strong> {header.account_name}
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
              {sale.itemLines.map((line) => (
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

          <div className="sale-print-payment-title">Dar / Jama Payment</div>

          <table className="sale-print-table">
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
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {sale.paymentLines.length === 0 ? (
                <tr>
                  <td colSpan={11}>No payment added.</td>
                </tr>
              ) : (
                sale.paymentLines.map((line) => (
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
                    <td>{line.details || '-'}</td>
                  </tr>
                ))
              )}

              <tr className="print-total-row">
                <td colSpan={6}>Total Jama</td>
                <td>{formatNumber(header.payment_fine_jama_total)}</td>
                <td>{formatNumber(header.payment_cash_jama_total)}</td>
                <td>{formatNumber(header.payment_bank_jama_total)}</td>
                <td>{formatNumber(header.payment_anamat_jama_total)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div className="sale-print-balance-grid">
            <div className="sale-print-balance-box">
              <div className="sale-print-balance-title">Old Balance</div>
              <BalanceLine label={`${header.metal_type} Fine`} value={oldFine} />
              <BalanceLine label="Cash" value={header.old_cash} />
              <BalanceLine label="Bank" value={header.old_bank} />
              <BalanceLine label="Anamat" value={header.old_anamat} />
            </div>

            <div className="sale-print-balance-box">
              <div className="sale-print-balance-title">Current Bill</div>
              <BalanceLine label="Item Fine" value={header.item_fine_total} />
              <BalanceLine label="Majuri" value={header.item_majuri_total} />
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

          <div className="sale-print-sign-row">
            <div>Receiver Signature</div>
            <div>Authorized Signature</div>
          </div>
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

export default SalePrintPreview
