'use client'
import { useState } from 'react'
import { TPC, TPCVendorRate, TEC } from '../../types/procurement'

interface Props {
  onClose: () => void
  onSave: (tpc: TPC) => void
  tecs: TEC[]
  existingCount: number
}

export default function CreateTPCModal({ onClose, onSave, tecs, existingCount }: Props) {
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const nextNum = String(existingCount + 1).padStart(3, '0')

  const [form, setForm] = useState({
    tpc_no: `TPC/${new Date().getFullYear()}/${nextNum}`,
    tpc_dt: today,
    tec_id: tecs[0]?.tec_no || '',
    committee_remarks: '',
    prepared_by: '',
  })

  const selectedTEC = tecs.find(t => t.tec_no === form.tec_id)
  const [rates, setRates] = useState<Record<string, TPCVendorRate>>({})

  const getRate = (vendorName: string): TPCVendorRate => {
    return rates[vendorName] || {
      party_cd: vendorName,
      party_nam: vendorName,
      quoted_rate: null,
      negotiated_rate: null,
      l1_rank: undefined,
      remarks: '',
      selected: false,
    }
  }

  const updateRate = (vendorName: string, field: Partial<TPCVendorRate>) => {
    setRates(r => ({ ...r, [vendorName]: { ...getRate(vendorName), ...field } }))
  }

  // Compute L1 ranks dynamically
  const computedRates = selectedTEC?.evaluations
    .filter(e => e.is_technically_suitable)
    .map(e => ({ ...getRate(e.vendor_name) }))
    .sort((a, b) => (a.negotiated_rate ?? a.quoted_rate ?? Infinity) - (b.negotiated_rate ?? b.quoted_rate ?? Infinity))
    .map((r, idx) => ({ ...r, l1_rank: idx + 1 })) || []

  const handleSave = () => {
    if (!selectedTEC) return
    setSaving(true)
    const selectedVendor = computedRates.find(r => r.selected) || computedRates[0]
    const tpc: TPC = {
      id: `tpc-${Date.now()}`,
      tpc_no: form.tpc_no,
      tpc_dt: form.tpc_dt,
      tec_id: selectedTEC.tec_no,
      tec_no: selectedTEC.tec_no,
      vsl_no: selectedTEC.te_no || '',
      vendor_rates: computedRates,
      final_vendor_cd: selectedVendor?.party_nam,
      final_vendor_name: selectedVendor?.party_nam,
      approved_rate: selectedVendor?.negotiated_rate ?? selectedVendor?.quoted_rate ?? undefined,
      committee_remarks: form.committee_remarks,
      prepared_by: form.prepared_by,
      status: 'Draft',
      created_at: new Date().toISOString(),
    }
    setTimeout(() => { onSave(tpc); setSaving(false) }, 400)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-cash-coin"></i>
            Create Tender Purchase Committee (TPC)
          </h2>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
            disabled={saving}
          >
            <i className="bi bi-x-lg text-xl"></i>
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {tecs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-clipboard2-check text-3xl text-gray-400"></i>
              </div>
              <p className="text-gray-900 font-bold text-xl mb-2">No TEC records found</p>
              <p className="text-gray-500 font-medium">Please create a TEC first before creating a TPC.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* TPC Header Details */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <i className="bi bi-info-circle-fill"></i>
                  TPC Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      TPC Number <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={form.tpc_no}
                      onChange={e => setForm(f => ({ ...f, tpc_no: e.target.value }))}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      TPC Date <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={form.tpc_dt}
                      onChange={e => setForm(f => ({ ...f, tpc_dt: e.target.value }))}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Reference TEC <span className="text-red-500">*</span>
                    </label>
                    <select value={form.tec_id}
                      onChange={e => setForm(f => ({ ...f, tec_id: e.target.value }))}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {tecs.map(t => (<option key={t.tec_no} value={t.tec_no}>{t.tec_no} - TE: {t.te_no}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Prepared By
                    </label>
                    <input type="text" placeholder="Officer name"
                      value={form.prepared_by}
                      onChange={e => setForm(f => ({ ...f, prepared_by: e.target.value }))}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rate Comparison Table */}
              {selectedTEC && (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200">
                  <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <i className="bi bi-bar-chart-fill"></i>
                    Comparative Rate Statement (CRS)
                  </h3>
                  <p className="text-sm font-medium text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                    Only technically compliant vendors from TEC <strong className="text-gray-900 font-bold">{selectedTEC.tec_no}</strong> are listed.
                    L1 ranking is auto-computed based on negotiated/quoted rate.
                  </p>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedTEC.evaluations
                      .filter(e => e.is_technically_suitable)
                      .map((vendor, vIdx) => {
                        const r = getRate(vendor.vendor_name)
                        const rank = computedRates.find(cr => cr.party_nam === vendor.vendor_name)?.l1_rank
                        return (
                          <div key={vIdx} className={`bg-white border-2 rounded-lg overflow-hidden transition-all ${r.selected ? 'border-green-500' : 'border-gray-200 hover:border-gray-300'}`}>
                            <div className={`px-4 py-3 flex flex-wrap items-center justify-between border-b-2 gap-3 ${r.selected ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-200'}`}>
                              <div className="flex items-center gap-3">
                                {rank === 1 && (
                                  <span className="bg-yellow-400 text-yellow-950 text-xs font-black px-3 py-1 rounded shadow-sm uppercase tracking-wider">L1</span>
                                )}
                                {rank && rank > 1 && (
                                  <span className="bg-gray-300 text-gray-700 text-xs font-black px-3 py-1 rounded shadow-sm uppercase tracking-wider">L{rank}</span>
                                )}
                                <span className="font-bold text-gray-900 text-sm">{vendor.vendor_name}</span>
                                {vendor.is_technically_suitable && (
                                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded flex items-center gap-1.5">
                                    <i className="bi bi-check-circle-fill"></i> Recommended
                                  </span>
                                )}
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={r.selected}
                                  onChange={e => updateRate(vendor.vendor_name, { selected: e.target.checked })}
                                  className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                                />
                                <span className={`text-sm font-semibold ${r.selected ? 'text-green-700' : 'text-gray-600'}`}>Select Vendor</span>
                              </label>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Quoted Rate (â‚¹)</label>
                                <input type="number" min={0} step={0.01}
                                  value={r.quoted_rate ?? ''}
                                  onChange={e => updateRate(vendor.vendor_name, { quoted_rate: e.target.value ? Number(e.target.value) : null })}
                                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Negotiated Rate (â‚¹)</label>
                                <input type="number" min={0} step={0.01}
                                  value={r.negotiated_rate ?? ''}
                                  onChange={e => updateRate(vendor.vendor_name, { negotiated_rate: e.target.value ? Number(e.target.value) : null })}
                                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
                                <input type="text" placeholder="Negotiation notes..."
                                  value={r.remarks}
                                  onChange={e => updateRate(vendor.vendor_name, { remarks: e.target.value })}
                                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Committee Remarks */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <i className="bi bi-chat-right-text-fill"></i>
                  TPC Committee Decision
                </h3>
                <textarea rows={3} placeholder="Final TPC committee decision and justification..."
                  value={form.committee_remarks}
                  onChange={e => setForm(f => ({ ...f, committee_remarks: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || tecs.length === 0}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold rounded-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle-fill"></i>
                  Save TPC
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={onClose} 
              disabled={saving}
              className="px-8 py-3 border-2 border-gray-400 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}




