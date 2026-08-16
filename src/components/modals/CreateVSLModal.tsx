
'use client'
import { useState, useEffect, useMemo } from 'react'

interface Props {
  onClose: () => void
  onSave: (vsl: any) => void
  existingCount: number
}

interface VSLItemRow {
  lf_no: string
  item_description: string
  stock_qty: number
  shis_qty: number       // user-entered SHIS qty
  required_qty: number   // user-entered required qty (may differ from SHIS)
  lte_qty: number        // auto = 80% of required_qty
  sdote_qty: number      // auto = 20% of required_qty
  unit_rate: number      // LSoR, editable
  shis_details?: any[]
  pending_orders?: any[]
  previous_vendors?: string[]
}

const FY = (() => {
  const now = new Date()
  const m = now.getMonth() + 1
  return m >= 4 ? now.getFullYear() : now.getFullYear() - 1
})()
const FY_YY = String(FY).slice(-2)

export default function CreateVSLModal({ onClose, onSave, existingCount }: Props) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // LF Input
  const [lfInput, setLfInput] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  // VSL Form State
  const [form, setForm] = useState({
    te_typ: 'LTE',
    opt_cl: 'Yes',
    opt_cl_pct: 25,
    tpc_lv: 'TPC Level-I', // auto-calc later
    tpc_lv_override: false,
    head_cd: '08601 LP',
    bid_typ: 'Double Bid',
    qty_dist: 'No',
    dp_days: 180,
    gst_per: 18.00,
    user_id: 'USER_' + Math.floor(Math.random() * 1000), // mock
  })

  // Derived Sequence No
  const seq = String(existingCount + 1).padStart(5, '0')
  const preTeNo = `${FY_YY}35P${seq}`
  const isOTE = form.te_typ === 'OTE'

  // Item Rows 
  const [itemRows, setItemRows] = useState<VSLItemRow[]>([])
  
  // Selected Vendors
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set())

  // Dynamic Aggregation of all past vendors from itemRows
  const aggregatedVendors = useMemo(() => {
    const vSet = new Set<string>()
    itemRows.forEach(r => {
      (r.previous_vendors || []).forEach(v => {
        if (v !== 'No Prior Supplier Recorded') vSet.add(v)
      })
    })
    return Array.from(vSet).sort()
  }, [itemRows])

  // Automatically select vendors when the aggregated list changes
  useEffect(() => {
    setSelectedVendors(new Set(aggregatedVendors))
  }, [aggregatedVendors])

  const [lteCase, setLteCase] = useState(0)
  const [sdoteCase, setSdoteCase] = useState(0)

  // Calc Logic
  const calcItemValues = (r: VSLItemRow, optP: number, gstP: number, calcLTEOption = true) => {
    const lte_val = r.lte_qty * r.unit_rate
    const lte_opt = calcLTEOption ? lte_val * (1 + (optP / 100)) : lte_val
    const lte_with_gst = lte_opt * (1 + (gstP / 100))

    const sdote_val = r.sdote_qty * r.unit_rate
    const sdote_with_gst = sdote_val * (1 + (gstP / 100))

    return { lte_with_gst, sdote_with_gst }
  }

  const calcTpcLevel = (val: number) => {
    if (form.tpc_lv_override) return form.tpc_lv
    if (val <= 5000000) return 'TPC Level-I'
    if (val <= 50000000) return 'TPC Level-II'
    return 'TPC Level-III'
  }

  // Recalc when te_typ changes
  useEffect(() => {
    setItemRows(prev => prev.map(r => {
      const lte = isOTE ? r.required_qty : Math.round(r.required_qty * 0.8)
      return { ...r, lte_qty: lte, sdote_qty: isOTE ? 0 : r.required_qty - lte }
    }))
  }, [isOTE])

  // Recalc Case Values & TPC Level
  useEffect(() => {
    let lteTotal = 0, sdoteTotal = 0
    itemRows.forEach(r => {
      const v = calcItemValues(r, form.opt_cl === 'Yes' ? form.opt_cl_pct : 0, form.gst_per, !isOTE)
      lteTotal += v.lte_with_gst
      sdoteTotal += v.sdote_with_gst
    })
    setLteCase(lteTotal)
    setSdoteCase(sdoteTotal)

    const total = lteTotal + sdoteTotal
    if (!form.tpc_lv_override) {
      setForm(f => ({ ...f, tpc_lv: calcTpcLevel(total) }))
    }
  }, [itemRows, form.opt_cl, form.opt_cl_pct, form.gst_per, form.tpc_lv_override, isOTE])

  const handleAddItem = async () => {
    if (!lfInput.trim()) return
    setError(null)
    setAddingItem(true)

    try {
      // Check if already added
      if (itemRows.some(r => r.lf_no === lfInput.trim())) {
        throw new Error('This LF No is already added.')
      }

      const res = await fetch(`/api/procurement/item-details?lf_no=${encodeURIComponent(lfInput.trim())}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch item details')
      }

      const it = data.item
      const shis = it.total_shis_quantity || 100
      const lte = isOTE ? shis : Math.round(shis * 0.8)
      const sdote = isOTE ? 0 : (shis - lte)

      const newRow: VSLItemRow = {
        lf_no: it.lf_no,
        item_description: it.item_description,
        stock_qty: 0,
        shis_qty: shis,
        required_qty: shis,
        lte_qty: lte,
        sdote_qty: sdote,
        unit_rate: it.last_supplied_rate || 0,
        shis_details: it.shis_details || [],
        pending_orders: it.pending_orders || [],
        previous_vendors: it.previous_vendors || [],
      }

      setItemRows(prev => [...prev, newRow])
      setLfInput('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAddingItem(false)
    }
  }

  const updateItem = (idx: number, field: keyof VSLItemRow, value: number | string) => {
    setItemRows(prev => {
      const updated = [...prev]
      const row = { ...updated[idx], [field]: value }

      // Auto-recalc LTE/SDOTE when required_qty changes
      if (field === 'required_qty') {
        const req = Number(value) || 0
        row.lte_qty = isOTE ? req : Math.round(req * 0.8)
        row.sdote_qty = isOTE ? 0 : req - row.lte_qty
      }

      updated[idx] = row
      return updated
    })
  }

  const removeItem = (idx: number) => {
    setItemRows(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        pre_te_no: preTeNo,
        te_typ: form.te_typ,
        opt_cl: form.opt_cl,
        opt_cl_pct: form.opt_cl === 'Yes' ? form.opt_cl_pct : 0,
        tpc_lv: form.tpc_lv,
        head_cd: form.head_cd,
        bid_typ: form.bid_typ,
        qty_dist: form.qty_dist,
        dp_days: form.dp_days,
        gst_per: form.gst_per,
        user_id: form.user_id,
        upd_dt: new Date().toISOString(),
        lte_case_value: lteCase,
        sdote_case_value: sdoteCase,
        total_case_value: lteCase + sdoteCase,
        items: itemRows,
        vendors: aggregatedVendors.map(v => ({
          party_nam: v,
          is_selected: selectedVendors.has(v),
        })),
      }

      const res = await fetch('/api/procurement/save-vsl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      
      if (!json.success) throw new Error(json.error)

      onSave(payload)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totalCase = lteCase + sdoteCase

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-6 flex flex-col">

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 px-7 py-5 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">Create VSL / Pre-TE</h2>
            <p className="text-indigo-200 text-sm mt-0.5">Minutes of Vendor Selection — {preTeNo}</p>
          </div>
          {/* Step Indicators */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${step === s ? 'bg-white text-indigo-700 shadow-md ring-4 ring-indigo-400 ring-opacity-50' : 
                    step > s ? 'bg-indigo-300 text-indigo-800' : 'bg-indigo-800 text-indigo-400'}`}
                >
                  {step > s ? <i className="bi bi-check-lg"></i> : s}
                </div>
                {s !== 3 && <div className={`w-10 h-1 mx-1 rounded ${step > s ? 'bg-indigo-300' : 'bg-indigo-800'}`}></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-start gap-3 border border-red-200">
              <i className="bi bi-exclamation-triangle-fill mt-0.5"></i>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* STEP 1: Tender Details */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                  <i className="bi bi-card-checklist text-lg"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Tender Configuration</h3>
              </div>
              
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tender Type</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                    value={form.te_typ}
                    onChange={e => {
                      const t = e.target.value
                      setForm(f => ({ ...f, te_typ: t, bid_typ: t === 'OTE' ? 'Single Bid' : 'Double Bid' }))
                    }}
                  >
                    <option value="LTE">LTE (Limited Tender)</option>
                    <option value="STE">STE (Single Tender)</option>
                    <option value="OTE">OTE (Open Tender)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Type of Bid</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                    value={form.bid_typ}
                    onChange={e => setForm({ ...form, bid_typ: e.target.value })}
                  >
                    <option value="Single Bid">Single Bid</option>
                    <option value="Double Bid">Double Bid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Option Clause</label>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                      value={form.opt_cl}
                      onChange={e => setForm({ ...form, opt_cl: e.target.value })}
                      disabled={isOTE}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    {form.opt_cl === 'Yes' && !isOTE && (
                      <input 
                        type="number"
                        className="w-20 px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-indigo-700 text-center"
                        value={form.opt_cl_pct}
                        onChange={e => setForm({ ...form, opt_cl_pct: Number(e.target.value) })}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">TPC Level</label>
                  <div className="flex gap-2 items-center">
                    <select 
                      className="flex-1 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-xl focus:ring-2 focus:ring-indigo-500"
                      value={form.tpc_lv}
                      onChange={e => setForm({ ...form, tpc_lv: e.target.value, tpc_lv_override: true })}
                    >
                      <option value="TPC Level-I">TPC Level-I</option>
                      <option value="TPC Level-II">TPC Level-II</option>
                      <option value="TPC Level-III">TPC Level-III</option>
                    </select>
                    {form.tpc_lv_override && (
                      <button onClick={() => setForm({ ...form, tpc_lv_override: false })} className="text-gray-400 hover:text-indigo-600" title="Revert to auto-calculation">
                        <i className="bi bi-arrow-counterclockwise"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Head Code</label>
                  <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    value={form.head_cd} onChange={e => setForm({ ...form, head_cd: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Quantity Dist.</label>
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    value={form.qty_dist} onChange={e => setForm({ ...form, qty_dist: e.target.value })}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Delivery (Days)</label>
                  <input type="number" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                    value={form.dp_days} onChange={e => setForm({ ...form, dp_days: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">GST %</label>
                  <input type="number" step="0.01" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-emerald-700"
                    value={form.gst_per} onChange={e => setForm({ ...form, gst_per: Number(e.target.value) })} />
                </div>
              </div>

              {/* Add Item Section */}
              <div className="mt-8">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200 mb-4">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <i className="bi bi-box-seam text-lg"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Add Items to VSL</h3>
                </div>
                <div className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Enter LF Number</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-lg shadow-sm"
                      placeholder="e.g. 1000000001"
                      value={lfInput}
                      onChange={e => setLfInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                    />
                  </div>
                  <button 
                    onClick={handleAddItem}
                    disabled={addingItem || !lfInput.trim()}
                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
                  >
                    {addingItem ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-plus-lg"></i>}
                    Add Item
                  </button>
                </div>
              </div>

              {/* Added Items Preview */}
              {itemRows.length > 0 && (
                <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 font-bold">LF No</th>
                        <th className="px-4 py-3 font-bold">Description</th>
                        <th className="px-4 py-3 font-bold text-center">SHIS Qty</th>
                        <th className="px-4 py-3 font-bold text-right">LSoR Rate</th>
                        <th className="px-4 py-3 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itemRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">{row.lf_no}</td>
                          <td className="px-4 py-3 font-medium">{row.item_description}</td>
                          <td className="px-4 py-3 text-center font-bold text-indigo-600">{row.shis_qty}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-600">₹{row.unit_rate.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                              <i className="bi bi-trash3-fill"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Items & Quantities */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <i className="bi bi-boxes text-lg"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Items & Quantities</h3>
              </div>

              {itemRows.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <i className="bi bi-inbox text-4xl mb-3 block text-gray-400"></i>
                  <p>No items added yet. Go back to step 1 to add items.</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-gray-200 rounded-2xl shadow-sm">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-gray-200 text-slate-700">
                      <tr>
                        <th className="px-4 py-4 font-bold">Item Description (LF No)</th>
                        <th className="px-4 py-4 font-bold text-center w-28">Required Qty</th>
                        <th className="px-4 py-4 font-bold text-center w-28">LTE Qty (80%)</th>
                        <th className="px-4 py-4 font-bold text-center w-28">SDOTE Qty (20%)</th>
                        <th className="px-4 py-4 font-bold text-center w-32">Unit Rate (LSoR)</th>
                        <th className="px-4 py-4 font-bold text-right w-40">Est. Total (inc. Tax)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itemRows.map((row, idx) => {
                        const v = calcItemValues(row, form.opt_cl === 'Yes' ? form.opt_cl_pct : 0, form.gst_per, !isOTE)
                        return (
                          <tr key={idx} className="hover:bg-blue-50 transition-colors">
                            <td className="px-4 py-4 whitespace-normal">
                              <p className="font-bold text-slate-800">{row.item_description}</p>
                              <p className="text-xs text-slate-500 font-mono mt-0.5">LF: {row.lf_no} | SHIS: <span className="font-bold text-indigo-500">{row.shis_qty}</span></p>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <input type="number" className="w-20 px-2 py-1.5 border border-gray-300 rounded font-bold text-center focus:ring-2 focus:ring-blue-500"
                                value={row.required_qty} onChange={e => updateItem(idx, 'required_qty', e.target.value)} />
                            </td>
                            <td className="px-4 py-4 text-center">
                              <input type="number" className="w-20 px-2 py-1.5 border border-gray-300 rounded font-bold text-center focus:ring-2 focus:ring-blue-500 text-indigo-700"
                                value={row.lte_qty} onChange={e => updateItem(idx, 'lte_qty', e.target.value)} disabled={isOTE} />
                            </td>
                            <td className="px-4 py-4 text-center">
                              <input type="number" className="w-20 px-2 py-1.5 border border-gray-300 rounded font-bold text-center focus:ring-2 focus:ring-blue-500 text-amber-700"
                                value={row.sdote_qty} onChange={e => updateItem(idx, 'sdote_qty', e.target.value)} disabled={isOTE} />
                            </td>
                            <td className="px-4 py-4 text-center">
                              <input type="number" className="w-24 px-2 py-1.5 border border-gray-300 rounded font-mono font-bold text-right focus:ring-2 focus:ring-blue-500 text-emerald-700"
                                value={row.unit_rate} onChange={e => updateItem(idx, 'unit_rate', e.target.value)} />
                            </td>
                            <td className="px-4 py-4 text-right font-mono font-bold text-slate-700">
                              ₹{(v.lte_with_gst + v.sdote_with_gst).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-gray-300 text-slate-800">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right">Estimated Case Value:</td>
                        <td className="px-4 py-3 text-right text-lg text-indigo-700">₹{totalCase.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Vendors & Save */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                  <i className="bi bi-buildings text-lg"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Vendor Selection</h3>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-2xl border border-purple-100 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-purple-900 text-lg">Auto-Aggregated Vendor List</h4>
                  <p className="text-purple-700 text-sm mt-1">Based on previous PO history of the {itemRows.length} items added.</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-purple-700">{selectedVendors.size}</span>
                  <span className="text-purple-600 font-medium ml-2">Selected</span>
                </div>
              </div>

              {aggregatedVendors.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-gray-300">
                  <p className="text-slate-500 font-medium">No previous vendors found for these items.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {aggregatedVendors.map((vendor, idx) => (
                    <label key={idx} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${selectedVendors.has(vendor) 
                        ? 'border-purple-500 bg-purple-50 shadow-sm' 
                        : 'border-gray-200 hover:border-purple-300 bg-white'}`}
                    >
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                        checked={selectedVendors.has(vendor)}
                        onChange={(e) => {
                          const newSet = new Set(selectedVendors)
                          if (e.target.checked) newSet.add(vendor)
                          else newSet.delete(vendor)
                          setSelectedVendors(newSet)
                        }}
                      />
                      <span className={`font-bold ${selectedVendors.has(vendor) ? 'text-purple-900' : 'text-gray-700'}`}>
                        {vendor}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="bg-gray-50 px-8 py-5 flex items-center justify-between rounded-b-2xl border-t border-gray-200">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition"
          >
            Cancel
          </button>
          
          <div className="flex gap-3">
            {step > 1 && (
              <button 
                onClick={() => setStep(s => s - 1)}
                className="px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
              >
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button 
                onClick={() => {
                  if (step === 1 && itemRows.length === 0) {
                    setError('You must add at least one item to proceed.')
                    return
                  }
                  setStep(s => s + 1)
                  setError(null)
                }}
                className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 transition flex items-center gap-2"
              >
                Next Step <i className="bi bi-arrow-right"></i>
              </button>
            ) : (
              <button 
                onClick={handleSave}
                disabled={loading || selectedVendors.size === 0}
                className="px-8 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-2"
              >
                {loading ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-save2-fill"></i>}
                {loading ? 'Saving VSL...' : 'Generate VSL'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
