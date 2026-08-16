'use client'
import { useState, useEffect } from 'react'
import { TPC, TPCItemPriceBid, TPCItemDecision, TEC, VSL } from '../../types/procurement'

interface Props {
  onClose: () => void
  onSave: (tpc: TPC) => void
  tecs: TEC[]
  vsls?: VSL[]
  existingCount: number
}

function getTpcLevel(val: number) {
  if (val < 1000000)   return 'Non-TPC Level'
  if (val < 5000000)   return 'TPC-IV'
  if (val < 50000000)  return 'TPC-III'
  if (val < 250000000) return 'TPC-II'
  return 'TPC-I'
}

function fmt(n: number | null | undefined) {
  if (!n && n !== 0) return '-'
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CreateTPCModal({ onClose, onSave, tecs, vsls = [], existingCount }: Props) {
  const [step, setStep]     = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const today = new Date().toISOString().split('T')[0]
  const yr    = new Date().getFullYear()

  // â”€â”€ Step 1: Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [header, setHeader] = useState({
    tpc_no: `TPC/${yr}/${String(existingCount + 1).padStart(3, '0')}`,
    tpc_dt: today,
    tec_no: tecs[0]?.tec_no || '',
    gem_bid_no: '',
    gem_bid_dt: '',
    schedule_tod: '',
    case_value_initial: '',
    case_value_present: '',
    prepared_by: '',
    committee_remarks: '',
  })

  const selectedTEC   = tecs.find(t => t.tec_no === header.tec_no)
  const matchingVSL   = vsls.find(v => v.pre_te_no === selectedTEC?.te_no || v.vsl_no === selectedTEC?.te_no)
  const items: any[]  = (matchingVSL as any)?.items || []
  const techSuitable  = selectedTEC?.evaluations?.filter(e => e.is_technically_suitable) || []
  const caseValNum    = parseFloat(header.case_value_present || header.case_value_initial || '0') || 0
  const tpcLevel      = getTpcLevel(caseValNum)
  const gstPer        = Number((matchingVSL as any)?.pre_te?.gst_per || (matchingVSL as any)?.gst_per || 18)
  const optClPct      = Number((matchingVSL as any)?.pre_te?.opt_cl_pct || (matchingVSL as any)?.opt_cl_pct || 25)
  const hasSplitting  = (matchingVSL as any)?.pre_te?.qty_dist === 'Yes' || (matchingVSL as any)?.qty_dist === 'Yes'
  const teTyp         = (matchingVSL as any)?.pre_te?.te_typ || (matchingVSL as any)?.te_typ || 'OTE'

  // â”€â”€ Step 2: Price Bids per schedule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // bids[lf_no] = array of bid rows (one per vendor for that item)
  const initBids = () => {
    const map: Record<string, TPCItemPriceBid[]> = {}
    items.forEach((it: any, idx: number) => {
      map[it.lf_no] = techSuitable.map(ev => ({
        lf_no: it.lf_no,
        sch_no: idx + 1,
        vendor_name: ev.vendor_name,
        quoted_rate_excl_gst: null,
        quoted_rate_incl_gst: null,
        total_value_incl_gst: null,
        lpr_lsor_rate: (it as any).unit_rate_wo_tax || (it as any).unit_rate || null,
        lpr_lsor_date: null,
        lpr_lsor_type: 'LSoR' as 'LSoR',
        lpr_lsor_vendor: '',
        lpr_lsor_po_no: '',
        annl_escalation: null,
        is_mse: false,
        is_mii_class1: false,
      }))
    })
    return map
  }
  const [bids, setBids] = useState<Record<string, TPCItemPriceBid[]>>(initBids)

  useEffect(() => {
    if (items.length === 0) return;
    const fetchLastPos = async () => {
      const { createBrowser: createClient } = await import('../../lib/supabse/client');
      const supabase = createClient();
      const lfNos = items.map((it: any) => it.lf_no);
      const { data } = await supabase.from('po_order').select('po_no, po_dt, party_cd, lf_no, unit_rate_wo_tax, m_party(party_nam)').in('lf_no', lfNos).order('po_dt', { ascending: false });
      if (data && data.length > 0) {
        setBids(prev => {
          const next = { ...prev };
          lfNos.forEach((lf: string) => {
            const lastPo = data.find((d: any) => d.lf_no === lf);
            if (lastPo && next[lf]) {
              next[lf] = next[lf].map(bid => ({
                ...bid,
                lpr_lsor_rate: bid.lpr_lsor_rate || lastPo.unit_rate_wo_tax,
                lpr_lsor_date: bid.lpr_lsor_date || lastPo.po_dt,
                lpr_lsor_type: bid.lpr_lsor_type || 'LPR',
                lpr_lsor_vendor: bid.lpr_lsor_vendor || (lastPo.m_party as any)?.party_nam || lastPo.party_cd,
                lpr_lsor_po_no: bid.lpr_lsor_po_no || lastPo.po_no
              }));
            }
          });
          return next;
        });
      }
    };
    fetchLastPos();
  }, [items]);

  useEffect(() => {
    setBids(initBids())
    setDecisions(initDecisions())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header.tec_no])

  const updateBid = (lf: string, idx: number, field: Partial<TPCItemPriceBid>) => {
    setBids(prev => {
      const rows = [...(prev[lf] || [])]
      rows[idx] = { ...rows[idx], ...field }
      // auto-calc total
      if (field.quoted_rate_excl_gst !== undefined || field.quoted_rate_incl_gst !== undefined) {
        const r = rows[idx]
        const qty = items.find((it: any) => it.lf_no === lf)?.required_qty || 0
        
        // If excl gst changed, auto calculate incl gst (18%)
        if (field.quoted_rate_excl_gst !== undefined && r.quoted_rate_excl_gst) {
          r.quoted_rate_incl_gst = +(r.quoted_rate_excl_gst * 1.18).toFixed(2);
        }
        
        if (r.quoted_rate_incl_gst) {
          r.total_value_incl_gst = +(r.quoted_rate_incl_gst * qty).toFixed(2);
        } else {
          r.total_value_incl_gst = null;
        }
      }
      return { ...prev, [lf]: rows }
    })
  }

  const addBidVendor = (lf: string, schNo: number) => {
    setBids(prev => ({
      ...prev,
      [lf]: [...(prev[lf] || []), {
        lf_no: lf, sch_no: schNo, vendor_name: '', quoted_rate_excl_gst: null,
        quoted_rate_incl_gst: null, total_value_incl_gst: null,
        lpr_lsor_rate: null, lpr_lsor_date: null, lpr_lsor_type: 'LSoR', lpr_lsor_vendor: '',
        lpr_lsor_po_no: '', annl_escalation: null, is_mse: false, is_mii_class1: false,
      }]
    }))
  }

  const removeBidVendor = (lf: string, idx: number) => {
    setBids(prev => { const rows = [...(prev[lf] || [])]; rows.splice(idx, 1); return { ...prev, [lf]: rows } })
  }

  // Ranked bids per item (sorted by quoted_rate_excl_gst asc)
  const rankedBids = (lf: string) =>
    [...(bids[lf] || [])].sort((a, b) => (a.quoted_rate_excl_gst ?? Infinity) - (b.quoted_rate_excl_gst ?? Infinity))

  // â”€â”€ Step 3: Decisions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const initDecisions = () => {
    return items.map((it: any, idx: number) => ({
      lf_no: it.lf_no,
      sch_no: idx + 1,
      l1_vendor: null as string | null,
      l1_qty: hasSplitting ? +(Number(it.required_qty || 0) * 0.6).toFixed(0) : it.required_qty || 0,
      l2_vendor: null as string | null,
      l2_qty: hasSplitting ? +(Number(it.required_qty || 0) * 0.4).toFixed(0) : null,
      basic_price_per_unit: null as number | null,
      price_incl_gst_per_unit: null as number | null,
      total_order_price_incl_gst: null as number | null,
    }))
  }
  const [decisions, setDecisions] = useState<TPCItemDecision[]>(initDecisions)

  const updateDecision = (lf: string, field: Partial<TPCItemDecision>) => {
    setDecisions(prev => prev.map(d => {
      if (d.lf_no !== lf) return d
      const updated = { ...d, ...field }
      // auto-calc total
      if ((field.price_incl_gst_per_unit !== undefined || field.l1_qty !== undefined)) {
        const qty = (updated.l1_qty || 0) + (updated.l2_qty || 0)
        if (updated.price_incl_gst_per_unit && qty) {
          updated.total_order_price_incl_gst = +(updated.price_incl_gst_per_unit * qty).toFixed(2)
        }
      }
      return updated
    }))
  }

  // Pre-fill decisions from ranked bids when moving to step 3
  const prefillDecisions = () => {
    setDecisions(prev => prev.map(d => {
      const ranked = rankedBids(d.lf_no)
      const l1 = ranked[0]
      const l2 = ranked[1]
      return {
        ...d,
        l1_vendor: l1?.vendor_name || null,
        l2_vendor: hasSplitting ? (l2?.vendor_name || null) : null,
        basic_price_per_unit: l1?.quoted_rate_excl_gst || null,
        price_incl_gst_per_unit: l1?.quoted_rate_incl_gst || null,
        total_order_price_incl_gst: l1?.total_value_incl_gst || null,
      }
    }))
  }

  const handleSave = async () => {
    setError('')
    if (!header.tpc_no || !header.tpc_dt || !selectedTEC?.te_no) {
      setError('TPC No, Date and linked TEC are required.'); return
    }
    setSaving(true)
    try {
      const allBids = Object.values(bids).flat().filter(b => b.vendor_name)
      const payload = {
        tpc: {
          tpc_no: header.tpc_no,
          tpc_dt: header.tpc_dt,
          te_no: selectedTEC.te_no,
          tec_no: header.tec_no,
          gem_bid_no: header.gem_bid_no || null,
          gem_bid_dt: header.gem_bid_dt || null,
          schedule_tod: header.schedule_tod || null,
          case_value_initial: header.case_value_initial ? parseFloat(header.case_value_initial) : null,
          case_value_present: header.case_value_present ? parseFloat(header.case_value_present) : null,
          committee_remarks: header.committee_remarks || null,
          prepared_by: header.prepared_by,
          status: 'Draft',
        },
        price_bids: allBids,
        decisions,
      }
      const res = await fetch('/api/procurement/save-tpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      onSave({ ...payload.tpc, id: payload.tpc.tpc_no, created_at: new Date().toISOString(), price_bids: allBids, decisions } as TPC)
    } catch (e: any) {
      setError('Error saving TPC: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const stepLabel = ['Header', 'Price Bids', 'Decisions']

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8 flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-4 flex justify-between items-center rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <i className="bi bi-cash-coin"></i> Create TPC
            </h2>
            <p className="text-blue-100 text-sm mt-0.5">
              Step {step} of 3 â€” {stepLabel[step - 1]}
              {caseValNum > 0 && <span className="ml-3 bg-white/20 px-2 py-0.5 rounded text-xs font-bold">{tpcLevel}</span>}
            </p>
          </div>
          <button onClick={onClose} disabled={saving} className="text-white hover:bg-white/20 p-2 rounded-full transition">
            <i className="bi bi-x-lg text-xl"></i>
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex shrink-0">
          {[1,2,3].map(s => (
            <div key={s} className={`flex-1 h-1 ${s <= step ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6">

          {/* â”€â”€â”€ STEP 1: HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">TPC No *</label>
                  <input value={header.tpc_no} onChange={e => setHeader(h => ({ ...h, tpc_no: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">TPC Date *</label>
                  <input type="date" value={header.tpc_dt} onChange={e => setHeader(h => ({ ...h, tpc_dt: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Link to TEC *</label>
                <select value={header.tec_no} onChange={e => setHeader(h => ({ ...h, tec_no: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none">
                  {tecs.map(t => <option key={t.tec_no} value={t.tec_no}>{t.tec_no} â€” TE: {t.te_no}</option>)}
                </select>
                {selectedTEC && (
                  <p className="text-xs text-gray-500 mt-1">
                    {techSuitable.length} technically suitable vendor(s) â€¢ {items.length} schedule item(s) â€¢ TE Type: {teTyp}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">GeM Bid No</label>
                  <input value={header.gem_bid_no} onChange={e => setHeader(h => ({ ...h, gem_bid_no: e.target.value }))}
                    placeholder="GEM/2026/B/7291191"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">GeM Bid Date</label>
                  <input type="date" value={header.gem_bid_dt} onChange={e => setHeader(h => ({ ...h, gem_bid_dt: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Schedule ToD</label>
                <input type="date" value={header.schedule_tod} onChange={e => setHeader(h => ({ ...h, schedule_tod: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Case Value (Initial) â‚¹</label>
                  <input type="number" value={header.case_value_initial} onChange={e => setHeader(h => ({ ...h, case_value_initial: e.target.value }))}
                    placeholder="e.g. 26105217"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Case Value (Present) â‚¹ <span className="text-xs text-gray-400">(used for TPC Level)</span></label>
                  <input type="number" value={header.case_value_present} onChange={e => setHeader(h => ({ ...h, case_value_present: e.target.value }))}
                    placeholder="e.g. 21577993.50"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" />
                  {caseValNum > 0 && <p className="text-xs font-semibold text-blue-600 mt-1">Calculated Level: {tpcLevel}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Prepared By *</label>
                <input value={header.prepared_by} onChange={e => setHeader(h => ({ ...h, prepared_by: e.target.value }))}
                  placeholder="e.g. SHEETANSHU TIWARI"
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" />
              </div>
            </div>
          )}

          {/* â”€â”€â”€ STEP 2: PRICE BIDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === 2 && (
            <div className="space-y-8">
              {items.length === 0 && (
                <div className="text-center py-10 text-gray-500">No items found in the linked TEC/VSL. Please check the TEC selection.</div>
              )}
              {items.map((it: any, idx: number) => {
                const lf = it.lf_no
                const schBids = bids[lf] || []
                const sorted = rankedBids(lf)
                const benchmarkBid = schBids.find(b => b.lpr_lsor_rate)

                return (
                  <div key={lf} className="border-2 border-gray-100 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b border-gray-200">
                      <div className="font-bold text-gray-800">
                        SCH.{idx + 1} â€” LF: {lf} <span className="font-normal text-gray-600 ml-2">{it.item_description}</span>
                      </div>
                      <span className="text-sm text-gray-500">TE Qty: {it.required_qty}</span>
                    </div>
                    <div className="p-4">
                      {/* Benchmark Row */}
                      <div className="grid grid-cols-4 gap-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="col-span-4 text-xs font-bold text-amber-700 mb-1">Benchmark (LPR / LSoR)</div>
                        <div>
                          <label className="text-xs text-gray-600">Rate (excl. GST)</label>
                          <input type="number" value={schBids[0]?.lpr_lsor_rate || ''} onChange={e => updateBid(lf, 0, { lpr_lsor_rate: parseFloat(e.target.value) || null })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Benchmark Rate" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Date</label>
                          <input type="date" value={schBids[0]?.lpr_lsor_date || ''} onChange={e => {
                            const v = e.target.value
                            setBids(prev => { const rows = [...(prev[lf] || [])]; rows.forEach(r => { r.lpr_lsor_date = v }); return { ...prev, [lf]: rows } })
                          }} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Type</label>
                          <select value={schBids[0]?.lpr_lsor_type || 'LSoR'} onChange={e => {
                            const v = e.target.value as 'LPR' | 'LSoR'
                            setBids(prev => { const rows = [...(prev[lf] || [])]; rows.forEach(r => { r.lpr_lsor_type = v }); return { ...prev, [lf]: rows } })
                          }} className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                            <option>LPR</option><option>LSoR</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">PO No (S-XXXXX)</label>
                          <input value={schBids[0]?.lpr_lsor_po_no || ''} onChange={e => {
                            const v = e.target.value
                            setBids(prev => { const rows = [...(prev[lf] || [])]; rows.forEach(r => { r.lpr_lsor_po_no = v }); return { ...prev, [lf]: rows } })
                          }} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="S-2506010469" />
                        </div>
                        <div className="col-span-4">
                          <label className="text-xs text-gray-600">Benchmark Vendor</label>
                          <input value={schBids[0]?.lpr_lsor_vendor || ''} onChange={e => {
                            const v = e.target.value
                            setBids(prev => { const rows = [...(prev[lf] || [])]; rows.forEach(r => { r.lpr_lsor_vendor = v }); return { ...prev, [lf]: rows } })
                          }} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Vendor whose rate is benchmark" />
                        </div>
                      </div>

                      {/* Vendor Bids */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-blue-50">
                              <th className="border border-gray-300 px-2 py-1 text-left">Vendor Name</th>
                              <th className="border border-gray-300 px-2 py-1">Rate excl. GST</th>
                              <th className="border border-gray-300 px-2 py-1">Rate incl. GST</th>
                              <th className="border border-gray-300 px-2 py-1">Total incl. GST</th>
                              <th className="border border-gray-300 px-2 py-1">MSE</th>
                              <th className="border border-gray-300 px-2 py-1">MII-I</th>
                              <th className="border border-gray-300 px-2 py-1">L-Rank</th>
                              <th className="border border-gray-300 px-2 py-1">% Diff</th>
                              <th className="border border-gray-300 px-2 py-1 w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {schBids.map((bid, bi) => {
                              const rank = sorted.findIndex(s => s.vendor_name === bid.vendor_name) + 1
                              const pctDiff = bid.lpr_lsor_rate && bid.quoted_rate_excl_gst
                                ? (((bid.quoted_rate_excl_gst - bid.lpr_lsor_rate) / bid.lpr_lsor_rate) * 100).toFixed(2)
                                : '-'
                              return (
                                <tr key={bi} className={bi % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="border border-gray-300 px-2 py-1">
                                    <input value={bid.vendor_name} onChange={e => updateBid(lf, bi, { vendor_name: e.target.value })}
                                      className="w-full outline-none bg-transparent" placeholder="Vendor name" />
                                  </td>
                                  <td className="border border-gray-300 px-1 py-1">
                                    <input type="number" value={bid.quoted_rate_excl_gst || ''} onChange={e => updateBid(lf, bi, { quoted_rate_excl_gst: parseFloat(e.target.value) || null })}
                                      className="w-full outline-none text-right bg-transparent" placeholder="0.00" />
                                  </td>
                                  <td className="border border-gray-300 px-1 py-1">
                                    <input type="number" value={bid.quoted_rate_incl_gst || ''} onChange={e => updateBid(lf, bi, { quoted_rate_incl_gst: parseFloat(e.target.value) || null })}
                                      className="w-full outline-none text-right bg-transparent" placeholder="0.00" />
                                  </td>
                                  <td className="border border-gray-300 px-1 py-1">
                                    <input type="number" value={bid.total_value_incl_gst || ''} onChange={e => updateBid(lf, bi, { total_value_incl_gst: parseFloat(e.target.value) || null })}
                                      className="w-full outline-none text-right bg-transparent font-bold" placeholder="0.00" />
                                  </td>
                                  <td className="border border-gray-300 px-1 py-1 text-center">
                                    <input type="checkbox" checked={bid.is_mse || false} onChange={e => updateBid(lf, bi, { is_mse: e.target.checked })} />
                                  </td>
                                  <td className="border border-gray-300 px-1 py-1 text-center">
                                    <input type="checkbox" checked={bid.is_mii_class1 || false} onChange={e => updateBid(lf, bi, { is_mii_class1: e.target.checked })} />
                                  </td>
                                  <td className="border border-gray-300 px-1 py-1 text-center font-bold text-blue-700">
                                    {bid.quoted_rate_excl_gst ? `L-${rank}` : '-'}
                                  </td>
                                  <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${pctDiff !== '-' && parseFloat(String(pctDiff)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {pctDiff !== '-' ? (parseFloat(String(pctDiff)) > 0 ? '+' : '') + pctDiff + '%' : '-'}
                                  </td>
                                  <td className="border border-gray-300 px-1 py-1 text-center">
                                    {schBids.length > 1 && (
                                      <button onClick={() => removeBidVendor(lf, bi)} className="text-red-400 hover:text-red-600 text-xs">
                                        <i className="bi bi-trash"></i>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <button onClick={() => addBidVendor(lf, idx + 1)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <i className="bi bi-plus-circle"></i> Add Vendor
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* â”€â”€â”€ STEP 3: DECISIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === 3 && (
            <div className="space-y-6">
              {decisions.map((d, idx) => {
                const item = items.find((it: any) => it.lf_no === d.lf_no)
                const ranked = rankedBids(d.lf_no)
                return (
                  <div key={d.lf_no} className="border-2 border-gray-100 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <div className="font-bold text-gray-800">SCH.{d.sch_no} â€” LF: {d.lf_no}</div>
                      <div className="text-sm text-gray-600">{item?.item_description} â€¢ Qty: {item?.required_qty}</div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-700">L-1 Vendor</label>
                        <select value={d.l1_vendor || ''} onChange={e => updateDecision(d.lf_no, { l1_vendor: e.target.value })}
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none mt-1">
                          <option value="">â€” Select L-1 â€”</option>
                          {ranked.map(b => <option key={b.vendor_name} value={b.vendor_name}>{b.vendor_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700">L-1 Qty</label>
                        <input type="number" value={d.l1_qty || ''} onChange={e => updateDecision(d.lf_no, { l1_qty: parseFloat(e.target.value) || null })}
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none mt-1" />
                      </div>
                      {hasSplitting && <>
                        <div>
                          <label className="text-xs font-semibold text-gray-700">L-2 Vendor</label>
                          <select value={d.l2_vendor || ''} onChange={e => updateDecision(d.lf_no, { l2_vendor: e.target.value })}
                            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none mt-1">
                            <option value="">â€” Select L-2 â€”</option>
                            {ranked.filter(b => b.vendor_name !== d.l1_vendor).map(b => <option key={b.vendor_name} value={b.vendor_name}>{b.vendor_name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700">L-2 Qty</label>
                          <input type="number" value={d.l2_qty || ''} onChange={e => updateDecision(d.lf_no, { l2_qty: parseFloat(e.target.value) || null })}
                            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none mt-1" />
                        </div>
                      </>}
                      <div>
                        <label className="text-xs font-semibold text-gray-700">Basic Price/Unit (excl. GST)</label>
                        <input type="number" value={d.basic_price_per_unit || ''} onChange={e => updateDecision(d.lf_no, { basic_price_per_unit: parseFloat(e.target.value) || null })}
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none mt-1" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700">Price/Unit incl. GST</label>
                        <input type="number" value={d.price_incl_gst_per_unit || ''} onChange={e => updateDecision(d.lf_no, { price_incl_gst_per_unit: parseFloat(e.target.value) || null })}
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none mt-1" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-gray-700">Total Order Price incl. GST (auto)</label>
                        <input type="number" value={d.total_order_price_incl_gst || ''} onChange={e => updateDecision(d.lf_no, { total_order_price_incl_gst: parseFloat(e.target.value) || null })}
                          className="w-full border-2 border-blue-200 bg-blue-50 rounded-lg px-3 py-2 outline-none mt-1 font-bold" />
                      </div>
                    </div>
                  </div>
                )
              })}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Committee Remarks (for Deliberation section)</label>
                <textarea rows={5} value={header.committee_remarks} onChange={e => setHeader(h => ({ ...h, committee_remarks: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none resize-none"
                  placeholder="TPC deliberated upon the case and noted that...&#10;i. ...&#10;ii. ..." />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        {error && <div className="mx-6 mb-2 text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center shrink-0">
          <button onClick={() => { if (step > 1) setStep(s => s - 1) }} disabled={step === 1 || saving}
            className="px-5 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-40">
            Back
          </button>
          <div className="flex gap-3">
            {step < 3 ? (
              <button onClick={() => {
                if (step === 2) prefillDecisions()
                setStep(s => s + 1)
              }} disabled={saving || (step === 1 && !header.tec_no)}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-40">
                Next â†’
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-40 flex items-center gap-2">
                {saving ? <><i className="bi bi-hourglass-split animate-spin"></i> Saving...</> : <><i className="bi bi-check-circle"></i> Save TPC</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



