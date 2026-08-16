'use client'
import { useState } from 'react'
import { TPC } from '../../types/procurement'

interface Props { onClose: () => void; tpcs: TPC[] }

export default function PrintTPCModal({ onClose, tpcs }: Props) {
  const [selectedId, setSelectedId] = useState(tpcs[0]?.id || '')
  const tpc = tpcs.find(t => t.id === selectedId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto print:bg-white print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8 print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:rounded-none">
        <div className="bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-4 flex justify-between items-center rounded-t-2xl print:hidden">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-printer-fill"></i>
            Print Tender Purchase Committee (TPC)
          </h2>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
          >
            <i className="bi bi-x-lg text-xl"></i>
          </button>
        </div>

        {tpcs.length > 1 && (
          <div className="px-6 py-4 border-b-2 border-gray-200 bg-gray-50 print:hidden">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select TPC to Print</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              {tpcs.map(t => <option key={t.id} value={t.id}>{t.tpc_no} — {t.tpc_dt} (TEC: {t.tec_no})</option>)}
            </select>
          </div>
        )}

        {tpcs.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="bi bi-file-earmark-x text-3xl text-gray-400"></i>
            </div>
            <p className="text-gray-900 font-bold text-xl mb-2">No TPC records found</p>
            <p className="text-gray-500 font-medium">Create a TPC first to print it.</p>
          </div>
        ) : tpc ? (
          <div className="p-6 overflow-y-auto max-h-[75vh] print:max-h-none print:p-0 print:overflow-visible" id="print-area">
            <div className="bg-white p-8 print:p-0">
              {/* Document Header */}
              <div className="text-center border-b-2 border-gray-900 pb-5 mb-8">
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-widest mb-4">TENDER PURCHASE COMMITTEE REPORT</h1>
                <div className="flex justify-between mt-3 text-sm font-bold text-gray-800 flex-wrap gap-2">
                  <span><span className="text-gray-500 uppercase tracking-wider text-xs mr-2">TPC No:</span> {tpc.tpc_no}</span>
                  <span><span className="text-gray-500 uppercase tracking-wider text-xs mr-2">Date:</span> {tpc.tpc_dt}</span>
                  <span><span className="text-gray-500 uppercase tracking-wider text-xs mr-2">TEC Ref:</span> {tpc.tec_no}</span>
                  <span><span className="text-gray-500 uppercase tracking-wider text-xs mr-2">VSL Ref:</span> {tpc.vsl_no}</span>
                  <span><span className="text-gray-500 uppercase tracking-wider text-xs mr-2">Status:</span> {tpc.status}</span>
                </div>
                {tpc.prepared_by && (
                  <p className="text-sm mt-4 text-gray-800 font-bold"><span className="text-gray-500 uppercase tracking-wider text-xs mr-2">Prepared By:</span> {tpc.prepared_by}</p>
                )}
              </div>

              {/* Comparative Rate Statement */}
              <div className="mb-8">
                <h2 className="text-base font-black text-gray-900 mb-4 uppercase tracking-widest border-b-2 border-gray-900 pb-2 flex items-center gap-2">
                  <i className="bi bi-bar-chart-fill"></i> Comparative Rate Statement (CRS)
                </h2>
                <table className="w-full text-sm border-2 border-gray-900 border-collapse bg-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border-2 border-gray-900 px-4 py-3 text-center font-black text-gray-900 w-16">Rank</th>
                      <th className="border-2 border-gray-900 px-4 py-3 text-left font-black text-gray-900">Vendor Name</th>
                      <th className="border-2 border-gray-900 px-4 py-3 text-right font-black text-gray-900 w-40">Quoted Rate (₹)</th>
                      <th className="border-2 border-gray-900 px-4 py-3 text-right font-black text-gray-900 w-48">Negotiated Rate (₹)</th>
                      <th className="border-2 border-gray-900 px-4 py-3 text-center font-black text-gray-900 w-24">Selected</th>
                      <th className="border-2 border-gray-900 px-4 py-3 text-left font-black text-gray-900">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tpc.vendor_rates.map((vr, idx) => (
                      <tr key={idx} className={vr.selected ? 'bg-yellow-50/50' : 'bg-white'}>
                        <td className="border-2 border-gray-900 px-4 py-3 text-center">
                          <span className={`font-black text-xs px-2.5 py-1 rounded-md tracking-wider ${vr.l1_rank === 1 ? 'bg-yellow-400 text-yellow-950 print:bg-transparent print:text-black print:border-black print:border' : 'bg-gray-200 text-gray-800 print:bg-transparent print:text-black print:border-black print:border'}`}>
                            L{vr.l1_rank}
                          </span>
                        </td>
                        <td className="border-2 border-gray-900 px-4 py-3 font-bold text-gray-900">{vr.party_nam}</td>
                        <td className="border-2 border-gray-900 px-4 py-3 text-right font-mono font-bold text-gray-900">
                          {vr.quoted_rate != null ? `₹${Number(vr.quoted_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="border-2 border-gray-900 px-4 py-3 text-right font-mono font-black text-blue-700 print:text-black">
                          {vr.negotiated_rate != null ? `₹${Number(vr.negotiated_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="border-2 border-gray-900 px-4 py-3 text-center font-bold text-green-700 print:text-black">
                          {vr.selected ? 'Yes' : '—'}
                        </td>
                        <td className="border-2 border-gray-900 px-4 py-3 font-medium text-gray-700 print:text-black">{vr.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Final Decision */}
              {tpc.final_vendor_name && (
                <div className="mb-8 p-6 border-2 border-gray-900 rounded-none bg-white">
                  <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-widest border-b border-gray-300 pb-2">TPC Final Decision</h3>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <span className="text-gray-500 font-bold uppercase tracking-wider text-xs">Selected Vendor:</span><br />
                      <strong className="text-gray-900 text-lg mt-1 block">{tpc.final_vendor_name}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 font-bold uppercase tracking-wider text-xs">Approved Rate (Without Tax):</span><br />
                      <strong className="text-gray-900 font-mono text-lg mt-1 block">
                        {tpc.approved_rate != null ? `₹${Number(tpc.approved_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </strong>
                    </div>
                  </div>
                  {tpc.committee_remarks && (
                    <div className="mt-6 pt-4 border-t border-gray-300">
                      <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Committee Remarks:</span>
                      <p className="text-gray-900 text-sm mt-2 font-medium whitespace-pre-wrap">{tpc.committee_remarks}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Signatures */}
              <div className="flex justify-between mt-24 text-sm font-black text-gray-900 uppercase tracking-wider">
                <div className="text-center"><div className="border-t-2 border-gray-900 pt-3 w-48 mx-auto">Member 1</div></div>
                <div className="text-center"><div className="border-t-2 border-gray-900 pt-3 w-48 mx-auto">Member 2</div></div>
                <div className="text-center"><div className="border-t-2 border-gray-900 pt-3 w-48 mx-auto">Chairman, TPC</div></div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex gap-3 pt-4 p-6 border-t-2 border-gray-200 print:hidden">
          <button 
            type="button"
            onClick={() => window.print()} 
            disabled={!tpc}
            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold rounded-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <i className="bi bi-printer-fill"></i> Print TPC
          </button>
          <button 
            type="button"
            onClick={onClose} 
            className="px-8 py-3 border-2 border-gray-400 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

