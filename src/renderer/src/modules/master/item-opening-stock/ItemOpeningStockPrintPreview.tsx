import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { formatDate } from '../../../utils/printFormat'

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

type PrintableOpeningStockRecord = {
  id: string
  stockDate: string
  itemName: string
  metalType: string
  stampName: string
  designName: string
  pcs: number
  grossWeight: number
  lessWeight: number
  netWeight: number
  tanch: number
  wastage: number
  unit: 'Kg' | 'Gm' | 'Pcs'
  majuriRate: number
  fine: number
  majuri: number
}

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function ItemOpeningStockPrintPreview({
  records,
  onClose,
  autoPrintOnOpen = false
}: {
  records: PrintableOpeningStockRecord[]
  onClose: () => void
  autoPrintOnOpen?: boolean
}): React.JSX.Element {
  const [firm, setFirm] = useState<FirmRecord | null>(null)
  const [printerSetting, setPrinterSetting] = useState<PrinterSettingPayload>(defaultPrinterSetting)
  const [loadedSettings, setLoadedSettings] = useState(false)

  const stockDate = records[0]?.stockDate || ''

  const totals = useMemo(() => {
    return records.reduce(
      (total, record) => {
        total.pcs += Number(record.pcs || 0)
        total.grossWeight += Number(record.grossWeight || 0)
        total.netWeight += Number(record.netWeight || 0)
        total.fine += Number(record.fine || 0)
        total.majuri += Number(record.majuri || 0)

        return total
      },
      { pcs: 0, grossWeight: 0, netWeight: 0, fine: 0, majuri: 0 }
    )
  }, [records])

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
            Opening Stock Print Preview - {printerSetting.paperSize} / {printerSetting.printLayout}
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

                <div className="sale-print-title">OPENING STOCK</div>
                <div className="sale-print-header">
                  <div>
                    <strong>Stock Date:</strong> {formatDate(stockDate)}
                  </div>
                  <div>
                    <strong>Total Lines:</strong> {records.length}
                  </div>
                </div>

                <table className="sale-print-table sale-print-item-table">
                  <thead>
                    <tr>
                      <th>Sr</th>
                      <th>Item</th>
                      <th>Stamp</th>
                      <th>Design</th>
                      <th>Pcs</th>
                      <th>Gr. Wt.</th>
                      <th>L. Wt.</th>
                      <th>Net Wt.</th>
                      <th>Tunch</th>
                      <th>Wstg</th>
                      <th>Fine</th>
                      <th>Lab Rate</th>
                      <th>Majuri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => (
                      <tr key={record.id}>
                        <td>{index + 1}</td>
                        <td>{record.itemName}</td>
                        <td>{record.stampName || '-'}</td>
                        <td>{record.designName || '-'}</td>
                        <td>{formatNumber(record.pcs)}</td>
                        <td>{formatNumber(record.grossWeight)}</td>
                        <td>{formatNumber(record.lessWeight)}</td>
                        <td>{formatNumber(record.netWeight)}</td>
                        <td>{formatNumber(record.tanch)}</td>
                        <td>{formatNumber(record.wastage)}</td>
                        <td>{formatNumber(record.fine)}</td>
                        <td>
                          {formatNumber(record.majuriRate)} {record.unit}
                        </td>
                        <td>{formatNumber(record.majuri)}</td>
                      </tr>
                    ))}
                    <tr className="print-total-row">
                      <td colSpan={4}>Total</td>
                      <td>{formatNumber(totals.pcs)}</td>
                      <td>{formatNumber(totals.grossWeight)}</td>
                      <td></td>
                      <td>{formatNumber(totals.netWeight)}</td>
                      <td></td>
                      <td></td>
                      <td>{formatNumber(totals.fine)}</td>
                      <td></td>
                      <td>{formatNumber(totals.majuri)}</td>
                    </tr>
                  </tbody>
                </table>

                {printerSetting.showSignature && (
                  <div className="sale-print-sign-row">
                    <div>Prepared By</div>
                    <div>Authorised Signatory</div>
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

export default ItemOpeningStockPrintPreview
