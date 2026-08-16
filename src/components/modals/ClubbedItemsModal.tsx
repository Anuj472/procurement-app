'use client'
import { useEffect, useState } from 'react'
import { VendorPoolGroup, ClubbedTableItem } from '../../types/procurement'

interface Props {
  onClose: () => void
}

export default function ClubbedItemsModal({ onClose }: Props) {
  const [tenderGroups, setTenderGroups] = useState<VendorPoolGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/procurement/club-items')
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error)
        setTenderGroups(json.tender_groups || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handlePrint = () => {
    const printContent = document.getElementById('modal-print-section')?.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow && printContent) {
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(s => s.outerHTML)
        .join('');
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Clubbed Items</title>
            ${styles}
            <style>
              body { background: white !important; margin: 0; padding: 20px; height: auto !important; overflow: visible !important; }
              .print\\:hidden { display: none !important; }
              * { overflow: visible !important; max-height: none !important; position: static !important; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              setTimeout(() => {
                window.focus();
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
      `}} />
      <div id="modal-print-section" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto print:static print:bg-transparent print:block print:p-0">
        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8 print:shadow-none print:m-0 print:w-full print:max-w-none print:block">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-diagram-3-fill"></i>
            Clubbed Items for Tender
          </h2>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
          >
            <i className="bi bi-x-lg text-xl"></i>
          </button>
        </div>

        {/* Body */}
        <div id="modal-scroll-area" className="p-6 max-h-[75vh] overflow-y-auto space-y-6 print:p-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-blue-900 font-bold">Fetching vendor pools & SHIS data...</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg shadow-sm">
              <strong className="font-bold">Error:</strong> {error}
            </div>
          )}
          {!loading && !error && tenderGroups.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-folder-x text-3xl text-gray-400"></i>
              </div>
              <p className="text-gray-900 font-bold text-xl mb-2">No clubbed groups found.</p>
            </div>
          )}

          {tenderGroups.map((group, gIdx) => (
            <div key={gIdx} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200">
              {/* Group header */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                    #{gIdx + 1}
                  </div>
                  <h3 className="text-xl font-bold text-blue-900">Common Supplying Vendor Pool</h3>
                  <span className="ml-auto text-sm font-semibold px-3 py-1 rounded bg-blue-200 text-blue-800">
                    {group.items.length} Item{group.items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 ml-13">
                  {group.vendors.map((v: string, vIdx: number) => (
                    <span key={vIdx} className="text-sm bg-white text-gray-800 border-2 border-blue-200 font-semibold px-3 py-1 rounded-md shadow-sm">
                      <span className="text-gray-500 mr-1">{vIdx + 1}.</span> {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden shadow-sm mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-200 text-gray-700">
                        <th className="py-3 px-4 font-semibold w-[22%]">Item / LF No</th>
                        <th className="py-3 px-4 font-semibold w-[35%]">Previous Vendors</th>
                        <th className="py-3 px-4 font-semibold text-right w-[22%]">Last Supplied Rate</th>
                        <th className="py-3 px-4 font-semibold text-right w-[21%]">Total SHIS Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {group.items.map((item: ClubbedTableItem, iIdx: number) => (
                        <tr key={item.lf_no || iIdx} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 align-top">
                            <div className="font-bold text-blue-800 font-mono text-sm">{item.lf_no}</div>
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">{item.item_description}</div>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <ul className="space-y-1">
                              {item.previous_vendors?.map((v: string, vIdx: number) => (
                                <li key={vIdx} className="text-xs text-gray-700 flex items-start gap-2">
                                  <span className="text-gray-400 font-mono mt-0.5">{vIdx + 1}.</span>
                                  <span>{v}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="py-3 px-4 text-right align-top">
                            <div className="font-bold text-gray-900 font-mono text-base">
                              {item.last_supplied_rate != null
                                ? `₹${Number(item.last_supplied_rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : 'N/A'}
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase mt-0.5 font-semibold tracking-wider">Without Tax</div>
                          </td>
                          <td className="py-3 px-4 text-right align-top">
                            <span className="inline-block px-3 py-1 rounded bg-green-100 text-green-800 font-bold font-mono text-sm border border-green-200">
                              {Number(item.total_shis_quantity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

          {/* Footer Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t-2 border-gray-200 print:hidden">
            <button 
              type="button"
              onClick={handlePrint} 
              className="w-full py-3 border-2 border-indigo-600 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              Print Window
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="w-full py-3 border-2 border-gray-400 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

