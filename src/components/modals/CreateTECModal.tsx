'use client'
import { useState } from 'react'
import { TEC, TECVendorEvaluation, VSL } from '../../types/procurement'

interface Props {
  onClose: () => void
  onSave: (tec: TEC) => void
  vsls: VSL[]
  existingCount: number
}

export default function CreateTECModal({ onClose, onSave, vsls, existingCount }: Props) {
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const eligibleVsls = vsls.filter(v => !!v.te_no)

  const [form, setForm] = useState({
    tec_no: 'TEC/' + new Date().getFullYear() + '/' + String(existingCount + 1).padStart(3, '0'),
    tec_dt: today,
    tender_opening_dt: '',
    tec_level: 'TEC-II',
    vsl_id: eligibleVsls[0]?.id || '',
    committee_remarks: '',
    prepared_by: '',
  })

  const selectedVSL = eligibleVsls.find(v => v.id === form.vsl_id)
  const preTe = (selectedVSL as any)?.pre_te
  const totalCaseValue = preTe?.total_case_value || 0
  const isPactMandatory = totalCaseValue > 50000000

  const [evaluations, setEvaluations] = useState<Record<string, TECVendorEvaluation>>({})

  const getEval = (vendorName: string): TECVendorEvaluation => {
    return evaluations[vendorName] || {
      vendor_name: vendorName,
      compliance_statement: '',
      local_content_cert: '',
      nda_cert: '',
      non_blacklisted_cert: '',
      land_border_cert: '',
      msme_status: '',
      participation_as: '',
      gst_pct: '',
      for_destination_delivery: '',
      pre_integrity_pact: '',
      emd_status: '',
      registration_with_ofb: '',
      clarifications: '',
      user_section_remarks: '',
      is_technically_suitable: false,
    }
  }

  const updateEval = (vendorName: string, field: Partial<TECVendorEvaluation>) => {
    setEvaluations(ev => ({ ...ev, [vendorName]: { ...getEval(vendorName), ...field } }))
  }

  const handleSave = async () => {
    if (!selectedVSL || !selectedVSL.te_no) {
      alert('Please select a VSL that has been assigned a TE Number.')
      return
    }
    setSaving(true)

    const evalList = selectedVSL.vendors.map(v => getEval(v.party_nam))

    try {
      const res = await fetch('/api/procurement/create-tec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tecData: {
            tec_no: form.tec_no,
            te_no: selectedVSL.vsl_no || (selectedVSL as any).pre_te_no,
            tec_dt: form.tec_dt,
            tender_opening_dt: form.tender_opening_dt || null,
            tec_level: form.tec_level,
            committee_remarks: form.committee_remarks,
            prepared_by: form.prepared_by || 'System',
            status: 'Approved'
          },
          vendorEvaluations: evalList
        })
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to create TEC')

      onSave({
        tec_no: form.tec_no,
        te_no: selectedVSL.vsl_no || (selectedVSL as any).pre_te_no,
        tec_dt: form.tec_dt,
        tender_opening_dt: form.tender_opening_dt,
        tec_level: form.tec_level,
        evaluations: evalList,
        committee_remarks: form.committee_remarks,
        prepared_by: form.prepared_by,
        status: 'Approved'
      })
    } catch (err: any) {
      alert('Error creating TEC: ' + err.message)
      setSaving(false)
    }
  }

  if (eligibleVsls.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <i className="bi bi-exclamation-triangle-fill text-5xl text-yellow-500 mb-4 inline-block"></i>
          <h2 className="text-2xl font-black text-gray-900 mb-2">No TE Found</h2>
          <p className="text-gray-600 mb-6">Convert a VSL to a TE Number first before creating a TEC.</p>
          <button onClick={onClose} className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-[98vw] shadow-2xl flex flex-col" style={{maxHeight:'94vh'}}>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 flex items-center justify-between shrink-0 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <i className="bi bi-clipboard2-check-fill text-blue-300"></i> Create TEC
            </h2>
            <p className="text-blue-200 text-xs mt-0.5">Technical Evaluation Committee</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Top form */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Reference TE (Converted VSL)</label>
              <select value={form.vsl_id} onChange={e => setForm(f => ({ ...f, vsl_id: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-sm outline-none">
                {eligibleVsls.map(v => (
                  <option key={v.id} value={v.id}>{v.te_no} â€” {v.vsl_no}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">TEC No</label>
              <input type="text" value={form.tec_no} disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">TEC Date</label>
              <input type="date" value={form.tec_dt} onChange={e => setForm(f => ({ ...f, tec_dt: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tender Opening Dt</label>
              <input type="date" value={form.tender_opening_dt} onChange={e => setForm(f => ({ ...f, tender_opening_dt: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">TEC Level</label>
              <select value={form.tec_level} onChange={e => setForm(f => ({ ...f, tec_level: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                <option>TEC-I</option>
                <option>TEC-II</option>
                <option>TEC-III</option>
                <option>TEC-IV</option>
              </select>
            </div>
          </div>
          {selectedVSL && (
            <div className="mt-2 flex items-center gap-4 flex-wrap">
              <span className="text-xs text-slate-600 font-semibold">Case Value: <span className="text-blue-800 font-mono">Rs. {(totalCaseValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
              {isPactMandatory && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded border border-amber-200">
                  <i className="bi bi-shield-lock-fill"></i> Case &gt; 5Cr: Pre-Integrity Pact MANDATORY
                </span>
              )}
            </div>
          )}
        </div>

        {/* Matrix */}
        <div className="flex-1 overflow-auto p-4">
          {selectedVSL ? (
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Vendor Compliance Matrix â€” {selectedVSL.vendors.length} Vendors</span>
                <span className="text-xs text-slate-500 italic">Enter page references like "Submitted P-40" or "Page 249 (55%)"</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{minWidth:'1600px'}}>
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="p-2 text-left border border-blue-800 w-44 sticky left-0 bg-blue-900 z-10">Vendor Name</th>
                      <th className="p-2 border border-blue-800 w-32">Compliance<br/>Statement</th>
                      <th className="p-2 border border-blue-800 w-36">Local Content<br/>Certificate</th>
                      <th className="p-2 border border-blue-800 w-32">NDA/Non-<br/>Disclosure</th>
                      <th className="p-2 border border-blue-800 w-32">Non-Blacklisted<br/>Certificate</th>
                      <th className="p-2 border border-blue-800 w-32">Land Border<br/>Sharing Cert</th>
                      <th className="p-2 border border-blue-800 w-28">MSME<br/>Status</th>
                      <th className="p-2 border border-blue-800 w-32">OEM/Manufacturer<br/>Participation</th>
                      <th className="p-2 border border-blue-800 w-20">GST %</th>
                      <th className={"p-2 border border-blue-800 w-32 " + (isPactMandatory ? "bg-amber-700" : "")}>Pre-Integrity<br/>Pact{isPactMandatory ? " *" : ""}</th>
                      <th className="p-2 border border-blue-800 w-32">F.O.R &amp;<br/>Delivery</th>
                      <th className="p-2 border border-blue-800 w-32">EMD Status</th>
                      <th className="p-2 border border-blue-800 w-40">OFB<br/>Registration</th>
                      <th className="p-2 border border-blue-800 w-48">Clarifications /<br/>Correspondence</th>
                      <th className="p-2 border border-blue-800 w-48">User Section<br/>Remarks</th>
                      <th className="p-2 border border-blue-800 w-24">Technically<br/>Suitable?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVSL.vendors.map((vendor, vIdx) => {
                      const ev = getEval(vendor.party_nam)
                      return (
                        <tr key={vIdx} className={"border-b border-slate-200 " + (vIdx % 2 === 0 ? "bg-white" : "bg-slate-50")}>
                          <td className={"p-2 sticky left-0 z-10 border-r border-slate-300 font-bold " + (vIdx % 2 === 0 ? "bg-white" : "bg-slate-50")}>{vendor.party_nam}</td>
                          {[
                            { key: 'compliance_statement', val: ev.compliance_statement, ph: 'e.g. Submitted P-40' },
                            { key: 'local_content_cert', val: ev.local_content_cert, ph: 'e.g. Page 249 (55%)' },
                            { key: 'nda_cert', val: ev.nda_cert, ph: 'e.g. Submitted Pg 38B' },
                            { key: 'non_blacklisted_cert', val: ev.non_blacklisted_cert, ph: 'e.g. Submitted Pg 38' },
                            { key: 'land_border_cert', val: ev.land_border_cert, ph: 'e.g. P-37' },
                            { key: 'msme_status', val: ev.msme_status, ph: 'e.g. Pg 36 (Small)' },
                            { key: 'participation_as', val: ev.participation_as, ph: 'e.g. Manufacturer (Pg.40)' },
                            { key: 'gst_pct', val: ev.gst_pct, ph: 'e.g. 18% (Pg.40)' },
                            { key: 'pre_integrity_pact', val: ev.pre_integrity_pact, ph: isPactMandatory ? 'Required â€” Pg X' : 'e.g. P-246-248' },
                            { key: 'for_destination_delivery', val: ev.for_destination_delivery, ph: 'e.g. YES (P.40)' },
                            { key: 'emd_status', val: ev.emd_status, ph: 'e.g. No/Exempted, Reg OLF P.39' },
                            { key: 'registration_with_ofb', val: ev.registration_with_ofb, ph: 'e.g. Registered with OLF (P.39)' },
                            { key: 'clarifications', val: ev.clarifications, ph: 'Clarification text...' },
                            { key: 'user_section_remarks', val: ev.user_section_remarks, ph: 'e.g. Technically Acceptable vide letter dt...' },
                          ].map(({ key, val, ph }) => (
                            <td key={key} className={"p-1 border-r border-slate-200 " + (key === 'pre_integrity_pact' && isPactMandatory ? "bg-amber-50" : "")}>
                              {(key === 'clarifications' || key === 'user_section_remarks' || key === 'emd_status' || key === 'registration_with_ofb') ? (
                                <textarea rows={2} placeholder={ph} value={val || ''} onChange={e => updateEval(vendor.party_nam, { [key]: e.target.value })}
                                  className={"w-full p-1.5 border border-slate-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-300 outline-none resize-none text-xs leading-tight"} />
                              ) : (
                                <input type="text" placeholder={ph} value={val || ''} onChange={e => updateEval(vendor.party_nam, { [key]: e.target.value })}
                                  className={"w-full p-1.5 border border-slate-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-300 outline-none text-xs"} />
                              )}
                            </td>
                          ))}
                          <td className="p-2 text-center">
                            <label className="flex items-center justify-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={ev.is_technically_suitable} onChange={e => updateEval(vendor.party_nam, { is_technically_suitable: e.target.checked })}
                                className="w-4 h-4 rounded text-green-600" />
                              <span className={"text-xs font-bold " + (ev.is_technically_suitable ? "text-green-700" : "text-slate-400")}>
                                {ev.is_technically_suitable ? "YES" : "NO"}
                              </span>
                            </label>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-12">Select a TE to populate the vendor matrix.</div>
          )}

          {/* Committee Remarks */}
          <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">TEC L-II Deliberation / Committee Remarks (Section 11)</label>
            <textarea rows={4} placeholder="TEC deliberated upon the case and noted that:&#10;i. ...&#10;ii. ..." value={form.committee_remarks}
              onChange={e => setForm(f => ({ ...f, committee_remarks: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex gap-3 shrink-0">
          <button onClick={handleSave} disabled={saving || !selectedVSL}
            className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...</>
            ) : (
              <><i className="bi bi-check-circle-fill"></i>Finalize &amp; Create TEC</>
            )}
          </button>
          <button onClick={onClose} disabled={saving} className="px-8 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-all text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}


