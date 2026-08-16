
'use client'
import { useState } from 'react'

interface Props {
  onClose: () => void
}

interface SHISRecord {
  id: string
  lf_no: string
  shis_no: string
  shis_dt: string
  qty: number
  justification: string
}

export default function SHISRevalidationModal({ onClose }: Props) {
  const [step, setStep] = useState(1)
  const [lfInput, setLfInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [shisList, setShisList] = useState<SHISRecord[]>([])

  const handleAdd = async () => {
    const lf = lfInput.trim()
    if (!lf) return
    setError(null)
    setAdding(true)

    try {
      // Check if LF is already in list
      if (shisList.some(s => s.lf_no === lf)) {
        throw new Error('This LF Number has already been added.')
      }

      const res = await fetch(`/api/procurement/item-details?lf_no=${encodeURIComponent(lf)}`)
      const data = await res.json()
      
      if (!data.success) throw new Error(data.error || 'Failed to fetch details')
      if (!data.item.shis_details || data.item.shis_details.length === 0) {
        throw new Error('No SHIS records found for this LF Number.')
      }

      // Check if the latest SHIS is > 6 months old
      let latestDate = new Date(0)
      data.item.shis_details.forEach((s: any) => {
        const d = new Date(s.shis_dt)
        if (d > latestDate) latestDate = d
      })

      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      if (latestDate > sixMonthsAgo) {
        throw new Error(`The most recent SHIS for this item is dated ${latestDate.toLocaleDateString()}, which is less than 6 months old. Revalidation is not required.`)
      }

      // Add all SHIS records for this LF
      const newRecords: SHISRecord[] = data.item.shis_details.map((s: any) => ({
        id: `${lf}-${s.shis_no}`,
        lf_no: lf,
        shis_no: s.shis_no,
        shis_dt: s.shis_dt,
        qty: s.qty,
        justification: ''
      }))

      setShisList(prev => [...prev, ...newRecords])
      setLfInput('')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveLF = (lf_no: string) => {
    setShisList(prev => prev.filter(s => s.lf_no !== lf_no))
  }

  const updateJustification = (id: string, val: string) => {
    setShisList(prev => prev.map(s => s.id === id ? { ...s, justification: val } : s))
  }

  // "?"? Render "?"?
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-60 print:bg-white print:p-0">
      
      {/* UI Mode (Non-Print) */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-10 flex flex-col print:hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 px-7 py-5 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">SHIS Revalidation</h2>
            <p className="text-red-200 text-sm mt-0.5">Clause 2.5(c) of OFBPM-2018</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-red-200 text-2xl font-bold">
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-200">
              <i className="bi bi-exclamation-triangle-fill mt-0.5"></i>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              
              {/* Add LF Input */}
              <div className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Add LF Number</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 font-mono text-lg shadow-sm uppercase"
                    placeholder="e.g. 1000000001"
                    value={lfInput}
                    onChange={e => setLfInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  />
                </div>
                <button 
                  onClick={handleAdd}
                  disabled={adding || !lfInput.trim()}
                  className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  {adding ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-plus-lg"></i>}
                  Add Item
                </button>
              </div>

              {/* Table */}
              {shisList.length > 0 && (
                <div className="animate-fade-in border border-rose-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <div className="bg-rose-50/50 px-6 py-4 border-b border-rose-200 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-rose-700 font-bold">
                      <i className="bi bi-list-check"></i> 
                      Aggregated SHIS Records
                      <span className="bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full text-xs ml-2">{shisList.length} total</span>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto max-h-[50vh] custom-scrollbar">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-6 py-3 font-bold border-b">LF Number</th>
                          <th className="px-6 py-3 font-bold border-b">SHIS No.</th>
                          <th className="px-6 py-3 font-bold border-b text-center">Qty</th>
                          <th className="px-6 py-3 font-bold border-b text-center">Date</th>
                          <th className="px-6 py-3 font-bold border-b w-[40%]">Justification for revalidation</th>
                          <th className="px-6 py-3 font-bold border-b text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {shisList.map((s, idx) => {
                          const isFirstOfLF = idx === 0 || shisList[idx - 1].lf_no !== s.lf_no;
                          const rowCountForLF = shisList.filter(x => x.lf_no === s.lf_no).length;

                          return (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                              {/* Group LF Number Column */}
                              {isFirstOfLF && (
                                <td rowSpan={rowCountForLF} className="px-6 py-4 font-mono font-bold text-slate-800 border-r border-slate-100 bg-white align-top">
                                  {s.lf_no}
                                </td>
                              )}
                              
                              <td className="px-6 py-4 font-mono font-bold text-indigo-700">{s.shis_no}</td>
                              <td className="px-6 py-4 text-center font-bold text-slate-700">{s.qty}</td>
                              <td className="px-6 py-4 text-center font-medium text-slate-500 whitespace-nowrap">{s.shis_dt}</td>
                              <td className="px-6 py-2">
                                <input 
                                  type="text" 
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 bg-white"
                                  placeholder="Type justification here..."
                                  value={s.justification}
                                  onChange={e => updateJustification(s.id, e.target.value)}
                                />
                              </td>
                              
                              {/* Remove Action (Removes whole LF) */}
                              {isFirstOfLF && (
                                <td rowSpan={rowCountForLF} className="px-4 py-4 text-center align-top bg-white border-l border-slate-100">
                                  <button 
                                    onClick={() => handleRemoveLF(s.lf_no)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition"
                                    title="Remove this item"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button 
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setStep(2)}
                  disabled={shisList.length === 0}
                  className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <i className="bi bi-file-earmark-pdf"></i> Generate Printable Document
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                <div className="flex items-center gap-3">
                  <i className="bi bi-printer text-2xl"></i>
                  <div>
                    <h3 className="font-bold">Ready to Print</h3>
                    <p className="text-sm">Click the print button below. Select A4 paper and Portrait layout.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="px-4 py-2 bg-white border border-amber-300 rounded-lg font-bold hover:bg-amber-100 transition text-amber-900">
                    Back to Edit
                  </button>
                  <button onClick={() => window.print()} className="px-6 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition shadow-md">
                    Print Document
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* "?"? PRINT ONLY VIEW (Matches PDF format precisely) "?"? */}
      {step === 2 && (
        <div className="hidden print:block print:bg-white print:text-black w-full" style={{ fontFamily: 'Times New Roman, serif' }}>
          <div className="max-w-[210mm] mx-auto p-[20mm]">
            
            <div className="flex justify-end mb-8">
              <div className="text-right text-[15px] leading-relaxed">
                <div>No.OLF/MMD/Revalidation/SHISs/30</div>
                <div>Dated: <span className="underline pl-1">{new Date().toLocaleDateString('en-GB')}</span></div>
              </div>
            </div>

            <div className="mb-6 leading-relaxed">
              <div className="font-bold text-[16px]">Sub:Proposal for revalidation of SHISs</div>
              <div className="text-[15px]">Ref: Clause 2.5(c) of OFBPM-2018</div>
            </div>

            <div className="text-center mb-4 leading-relaxed">
              <div className="text-[15px]">(Part-I)</div>
              <div className="text-[15px]">(To be filled by MMD section)</div>
            </div>

            <table className="w-full border-collapse border border-black text-[15px] mb-16">
              <thead>
                <tr>
                  <th className="border border-black p-2 font-normal w-16 text-center">S.No.</th>
                  <th className="border border-black p-2 font-normal text-center">SHIS No.</th>
                  <th className="border border-black p-2 font-normal text-center w-28">SHISs Qty</th>
                  <th className="border border-black p-2 font-normal text-center w-[45%]">Justification for revalidation</th>
                </tr>
              </thead>
              <tbody>
                {shisList.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                    <td className="border border-black p-2 text-center">{s.shis_no}</td>
                    <td className="border border-black p-2 text-center">{s.qty}</td>
                    <td className="border border-black p-2">{s.justification}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between text-[15px] mb-12">
              <div>DO/GO MMD</div>
              <div>HOS/MMD</div>
            </div>

            <div className="text-center mb-6 leading-relaxed">
              <div className="text-[15px]">(Part-II)</div>
              <div className="text-[15px]">(To be filled by CP section)</div>
            </div>

            <div className="text-[15px] mb-12">
              Requirement of qty against above SHIS is existing as on date.
            </div>

            <div className="flex justify-between text-[15px] mb-12 pr-12">
              <div>DO/CP</div>
              <div className="ml-12">HOS/CP</div>
              <div>Material Planner</div>
            </div>

            <div className="text-center mb-6 leading-relaxed">
              <div className="text-[15px]">(Part-III)</div>
              <div className="text-[15px]">(To be filled by R&D section)</div>
            </div>

            <div className="text-[15px] mb-12">
              There is no change in specification or drawing of above SHIS as on date.
            </div>

            <div className="flex justify-between text-[15px] mb-12">
              <div>DO/R&D</div>
              <div>HOS/R&D</div>
            </div>

            <div className="text-center mb-6 leading-relaxed">
              <div className="text-[15px]">(Part-IV)</div>
              <div className="text-[15px]">(To be filled by MCO section)</div>
            </div>

            <div className="text-[15px] mb-12">
              Recommended /not recommended for revalidation of above SHIS.
            </div>

            <div className="flex justify-between text-[15px] mb-16 pr-12">
              <div>GO/CP</div>
              <div>DO/CP</div>
              <div>JWM/MCO</div>
            </div>

            <div className="flex justify-between text-[15px]">
              <div>GM/RR</div>
              <div className="font-bold">CHIEF GENERAL MANAGER</div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
