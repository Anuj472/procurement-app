'use client'
import { useState, useEffect } from 'react'
import { createBrowser as createClient } from '../../lib/supabse/client'
import { TPC, TPCItemPriceBid, TPCItemDecision } from '../../types/procurement'

interface Props {
  onClose: () => void
  tpcs: TPC[]
  tecs?: any[]
  vsls?: any[]
}

function dateStr(d: string | undefined | null) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-GB').replace(/\//g, '.') } catch { return d || '' }
}

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return '-'
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getTpcLevel(val: number) {
  if (val < 1000000)   return 'Non-TPC Level'
  if (val < 5000000)   return 'TPC-IV'
  if (val < 50000000)  return 'TPC-III'
  if (val < 250000000) return 'TPC-II'
  return 'TPC-I'
}

export default function PrintTPCModal({ onClose, tpcs, tecs = [], vsls = [] }: Props) {
  const [selectedId, setSelectedId] = useState(tpcs[0]?.tpc_no || '')
  const tpc = tpcs.find(t => t.tpc_no === selectedId)

  const matchingTec = tecs?.find(t => t.tec_no === tpc?.tec_no)
  const matchingVsl = vsls?.find(v => v.pre_te_no === matchingTec?.te_no || v.vsl_no === matchingTec?.te_no)
  const teTyp = (matchingVsl as any)?.pre_te?.te_typ || (matchingVsl as any)?.te_typ || 'OTE'
  const hasSplitting = (matchingVsl as any)?.pre_te?.qty_dist === 'Yes' || (matchingVsl as any)?.qty_dist === 'Yes'
  const caseValPresent = Number(tpc?.case_value_present || tpc?.case_value_initial || 0)
  const tpcLevel = getTpcLevel(caseValPresent)

  const bids: TPCItemPriceBid[] = (tpc as any)?.tpc_item_price_bids || tpc?.price_bids || []
  const decisions: TPCItemDecision[] = (tpc as any)?.tpc_item_decisions || tpc?.decisions || []

  // Group bids by lf_no ordered by sch_no
  const schedules: { lf_no: string; sch_no: number; bids: TPCItemPriceBid[] }[] = []
  const seen = new Set<string>()
  bids.forEach(b => {
    if (!seen.has(b.lf_no)) {
      seen.add(b.lf_no)
      const schBids = bids.filter(x => x.lf_no === b.lf_no).sort((a, z) => (a.quoted_rate_excl_gst || Infinity) - (z.quoted_rate_excl_gst || Infinity))
      schedules.push({ lf_no: b.lf_no, sch_no: b.sch_no, bids: schBids })
    }
  })
  schedules.sort((a, b) => a.sch_no - b.sch_no)

  const [poDetails, setPoDetails] = useState<any>({})
  
  useEffect(() => {
    const fetchPoData = async () => {
      const supabase = createClient()
      const lfNos = schedules.map(s => s.lf_no)
      if (lfNos.length === 0) return
      
      const { data, error } = await supabase
        .from('po_order')
        .select('po_no, po_dt, party_cd, lf_no, m_party(party_nam)')
        .in('lf_no', lfNos)
        .order('po_dt', { ascending: false })

      if (!error && data) {
        const poMap: any = {}
        lfNos.forEach(lf => {
          const allPos = data.filter((d: any) => d.lf_no === lf)
          if (allPos.length > 0) poMap[lf] = allPos
        })
        setPoDetails(poMap)
      }
    }
    fetchPoData()
  }, [selectedId])

  const cellCls = "border border-black p-1 align-top text-[9.5pt]"
  const thCls   = "border border-black p-1 font-bold text-center text-[9.5pt]"

  const handlePrint = () => {
    const el = document.getElementById('printable-tpc-document')
    if (!el) return
    const w = window.open('', '_blank', 'height=900,width=1100')
    if (!w) return
    w.document.write(`<html><head><title>Print TPC</title>
      <style>
        body{font-family:"Times New Roman",serif;font-size:10pt;color:#000;margin:0;background:#fff;-webkit-print-color-adjust:exact}
        table{width:100%;border-collapse:collapse;margin-bottom:12px}
        th,td{border:1px solid black;padding:3px 5px;vertical-align:top;text-align:left}
        thead{display:table-header-group}
        tr{page-break-inside:avoid}
        h2,h3,h4{text-align:center;font-weight:bold;margin:4px 0}
        @page{margin:15mm}
      </style></head><body>${el.outerHTML}
      <script>setTimeout(()=>{window.focus();window.print();window.close()},400)<\/script>
      </body></html>`)
    w.document.close()
  }

  if (!tpcs.length) return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 text-center max-w-sm">
        <p className="font-bold text-xl mb-4">No TPC records found</p>
        <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg">Close</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-gray-900/75 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-4 flex flex-col">
        {/* Toolbar */}
        <div className="bg-slate-800 px-5 py-3 flex justify-between items-center rounded-t-xl sticky top-0 z-10 print:hidden">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><i className="bi bi-printer"></i> Print TPC Document</h2>
          <div className="flex gap-3 items-center">
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 text-white border border-slate-600 rounded text-sm">
              {tpcs.map(t => <option key={t.tpc_no} value={t.tpc_no}>{t.tpc_no} â€” {dateStr(t.tpc_dt)}</option>)}
            </select>
            <button onClick={handlePrint} className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 text-sm">
              <i className="bi bi-printer mr-1"></i>Print
            </button>
            <button onClick={onClose} className="px-4 py-1.5 bg-slate-600 text-white font-semibold rounded hover:bg-slate-500 text-sm">Close</button>
          </div>
        </div>

        {!tpc ? (
          <div className="p-20 text-center font-bold text-xl">TPC not found.</div>
        ) : (
          <div id="printable-tpc-document" className="p-10 text-black"
            style={{fontFamily:'"Times New Roman",Times,serif', fontSize:'10pt', lineHeight:'1.4', backgroundColor:'white'}}>

            {/* HEADER */}
            <div className="text-center font-bold mb-3">
              <div className="text-[12pt] uppercase">OPTO ELECTRONICS FACTORY, DEHRADUN</div>
              <div className="text-[11pt] uppercase">MATERIAL MANAGEMENT DIRECT-2</div>
              <div className="text-[10pt] uppercase">(FULLY FINISHED GROUP)</div>
              <div className="text-[11.5pt] uppercase mt-1">BRIEF/ MINUTES OF {tpcLevel} LEVEL</div>
            </div>

            <table className="w-full border-collapse border border-black text-[10pt] mb-4">
              <tbody>
                <tr>
                  <td className={cellCls + " w-1/2"}>GEM BID NO.:- {tpc.gem_bid_no || tpc.te_no}</td>
                  <td className={cellCls}>TPC dt:- {dateStr(tpc.tpc_dt)}</td>
                </tr>
                <tr>
                  <td colSpan={2} className={cellCls}>GEM BID NO. DATE:- {dateStr(tpc.gem_bid_dt)}</td>
                </tr>
              </tbody>
            </table>

            {/* 1) INTRODUCTION */}
            <p className="font-bold underline mb-1">1) INTRODUCTION:-</p>
            <table className="w-full border-collapse border border-black text-[10pt] mb-4">
              <thead>
                <tr>
                  <th className={thCls + " w-12"}>Sl. No.</th>
                  <th className={thCls + " w-60"}>Term</th>
                  <th className={thCls + " w-4"}>:</th>
                  <th className={thCls}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['i.',    'SUBJECT',          'FOR PLACEMENT OF SUPPLY ORDERS'],
                  ['ii.',   'REFERENCE',         `GeM Bid No. ${tpc.gem_bid_no || tpc.te_no}, DATED ${dateStr(tpc.gem_bid_dt)} (P.12-17)`],
                  ['iii.',  'TENDER NO.',        tpc.gem_bid_no || tpc.te_no],
                  ['iv.',   'SCHEDULE ToD',      dateStr(tpc.schedule_tod)],
                  ['v.',    'TPC LEVEL',         tpcLevel],
                  ['vi.',   'USER SECTION',      (bids[0] as any)?.user_sect || 'EPS'],
                  ['vii.',  'MODE OF PROCUREMENT', teTyp + ' through GEM Customized bid.'],
                  ['viii.', 'CASE VALUE (INITIAL)', tpc.case_value_initial ? 'Rs. ' + fmt(tpc.case_value_initial) + ' (Including GST @ 18% with 25% option Clause)' : '-'],
                  ['ix.',   'CASE VALUE (PRESENT)', tpc.case_value_present ? 'Rs. ' + fmt(tpc.case_value_present) + ' (Including GST @ 18% with 25% option Clause)' : '-'],
                  ['x.',    'BID VALIDITY',      '180 Days'],
                  ['xi.',   'EMD',               'Applicable @3% (Exemption will be given as per erstwhile OFBPM 2018)'],
                  ['xii.',  'PSD',               'Applicable @3%'],
                  ['xiii.', 'OPTION CLAUSE',     'Applicable @25%'],
                  ['xiv.',  'DELIVERY PERIOD',   'Delivery 150 Days from the date of placement of S.O.'],
                  ['xv.',   'TENDER FLOATED FOR','OEMs /Manufacturers'],
                ].map(([sl, term, desc], i) => (
                  <tr key={i}>
                    <td className={thCls}>{sl}</td>
                    <td className={cellCls + " uppercase"}>{term}</td>
                    <td className={cellCls + " text-center"}>:</td>
                    <td className={cellCls + " whitespace-pre-wrap"}>{desc}</td>
                  </tr>
                ))}
                <tr>
                  <td className={thCls}>xvi.</td>
                  <td className={cellCls + " uppercase"}>ITEM WISE END STORE</td>
                  <td className={cellCls + " text-center"}>:</td>
                  <td className={cellCls}>
                    {schedules.map((sch, i) => (
                      <div key={i} className="mb-1">
                        SCH.{sch.sch_no} LF: {sch.lf_no} â€” {(sch.bids[0] as any)?.item_description || ''}
                        &nbsp; End Store:- 
                      </div>
                    ))}
                  </td>
                </tr>
              </tbody>
            </table>

            
            {/* 2) PRESENT DETAILS OF ITEMS */}
            <p className="font-bold underline mb-1">2) PRESENT DETAILS OF ITEMS (UNDER CONSIDERATION OF TEC):-</p>
            <table className="w-full border-collapse border border-black text-[9pt] mb-4">
              <thead>
                <tr>
                  <th className={thCls + " w-16"}>SCH. NO. / NOMENCLATURE (LF)</th>
                  <th className={thCls + " w-24"}>SHIS QTY</th>
                  <th className={thCls + " w-20"}>Qty. To be Procured</th>
                  <th className={thCls + " w-32"}>UNIT COST BASIC (LSoR)</th>
                  <th className={thCls + " w-24"}>VALUE (RS.)</th>
                  <th className={thCls + " w-48"}>LAST SUPPLIERS</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((sch, i) => {
                  const bench = sch.bids[0]
                  // Try to find the item in matching VSL
                  const matchingTec = tecs?.find(t => t.tec_no === tpc.tec_no)
                  const matchingVsl = vsls?.find(v => v.pre_te_no === matchingTec?.te_no || v.vsl_no === matchingTec?.te_no)
                  const vslItem = (matchingVsl as any)?.items?.find((it: any) => it.lf_no === sch.lf_no)
                  const itemDesc = (bench as any)?.item_description || vslItem?.item_description || ''
                  const reqQty = (bench as any)?.te_qty || vslItem?.required_qty || 0
                  const lsorRate = bench?.lpr_lsor_rate || (vslItem as any)?.unit_rate_wo_tax || (vslItem as any)?.unit_rate || 0
                  
                  return (
                    <tr key={i}>
                      <td className={cellCls}>
                        <div className="font-bold text-center mb-1">SCH.{sch.sch_no}</div>
                        <div>{itemDesc}</div>
                        <div className="font-bold mt-1">LF: {sch.lf_no}</div>
                      </td>
                      <td className={cellCls + " text-center text-[8pt]"}>
                        {vslItem?.shis_details && vslItem.shis_details.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {vslItem.shis_details.map((sh: any, si: number) => (
                              <div key={si} className="border border-gray-300 p-1">
                                <div>{sh.shis_no}</div>
                                <div>{sh.shis_dt}</div>
                                <div className="font-bold">{sh.qty}</div>
                              </div>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className={cellCls + " text-center font-bold"}>{reqQty} Nos.</td>
                      <td className={cellCls + " text-right"}>Rs. {fmt(lsorRate)}</td>
                      <td className={cellCls + " text-right"}>{fmt(reqQty * lsorRate)}</td>
                      <td className={cellCls}>
                        <div className="flex flex-col gap-2 text-[8.5pt]">
                          {poDetails[sch.lf_no] && poDetails[sch.lf_no].length > 0 ? (
                            Array.from(new Set(poDetails[sch.lf_no].map((p: any) => p.m_party?.party_nam || p.party_cd).filter(Boolean))).map((name: any, vi: number) => (
                              <div key={vi}>{name}</div>
                            ))
                          ) : (vslItem?.past_suppliers || []).length > 0 ? (
                            (vslItem.past_suppliers).map((v: any, vi: number) => (
                              <div key={vi}>{v.party_nam || v.vendor_name}</div>
                            ))
                          ) : (
                            <div>-</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>


            {/* 3) BACKGROUND */}
            <p className="font-bold underline mb-1">3) BACKGROUND OF THE CASE:-</p>
            <div className="mb-4 text-[9.5pt] text-justify">
              <p className="mb-1">i) VSL TPC-{tpcLevel} decided to issue OTE for the instant TE items with 25% option clause to the OEM/Manufacturers, with approved tender terms and conditions as mentioned in annexure-17 through GeM portal.</p>
              <p className="mb-1">ii) The OTE was floated on GeM website Vide Bid No {tpc.gem_bid_no || tpc.te_no} dated {dateStr(tpc.gem_bid_dt)}, with approved tender terms and conditions as mentioned in Annexure-17 through GeM custom bid.</p>
              <p className="mb-1">iii) On Tender opening the following {[...new Set(bids.map(b => b.vendor_name))].length} firms submitted their offer, against the bid.</p>
              <div className="ml-4">
                {[...new Set(bids.map(b => b.vendor_name))].map((v, i) => (
                  <div key={i}>{String.fromCharCode(97 + i)}. M/s {v}</div>
                ))}
              </div>
              <p className="mt-2 mb-1">iv) Refer to the TEC {tpc.tec_no}, it was decided to open the price bid of the technically suitable firms.</p>
            </div>

            {/* 4) PRICE DETAILS PER SCHEDULE */}
            <p className="font-bold underline mb-2">4) PRICE DETAILS OF TECHNICALLY ACCEPTABLE OFFERS:</p>
            {schedules.map((sch, si) => {
              const schDecision = decisions.find(d => d.lf_no === sch.lf_no)
              const l1Vendor = schDecision?.l1_vendor || sch.bids[0]?.vendor_name
              const benchBid = sch.bids[0]
              const totalWithOC = (schDecision?.total_order_price_incl_gst || 0) * 1.25

              return (
                <div key={si} className="mb-6">
                  <p className="font-bold text-[9.5pt] mb-1">4.{si + 1}. For item at schedule no.{sch.sch_no}, i.e LF: {sch.lf_no}</p>
                  <table className="w-full border-collapse border border-black text-[9pt] mb-2">
                    <thead>
                      <tr>
                        <th className={thCls + " w-48"}>VENDOR NAME (M/s)</th>
                        <th className={thCls + " w-28"}>QUOTED RATE (EXCL. GST) (INR)(per unit)</th>
                        <th className={thCls + " w-28"}>QUOTED RATE (INCL. GST) (INR)(per unit)</th>
                        <th className={thCls + " w-28"}>TOTAL VALUE INC. GST (in Rs.)</th>
                        <th className={thCls + " w-28"}>{benchBid?.lpr_lsor_type || 'LSoR'} (excl. GST) (INR)</th>
                        <th className={thCls + " w-20"}>% Diff. From LPR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sch.bids.map((bid, bi) => {
                        const pctDiff = bid.lpr_lsor_rate && bid.quoted_rate_excl_gst
                          ? (((bid.quoted_rate_excl_gst - bid.lpr_lsor_rate) / bid.lpr_lsor_rate) * 100).toFixed(2)
                          : ''
                        return (
                          <tr key={bi}>
                            <td className={cellCls}>M/s {bid.vendor_name}</td>
                            <td className={cellCls + " text-right"}>{fmt(bid.quoted_rate_excl_gst)}</td>
                            <td className={cellCls + " text-right"}>{fmt(bid.quoted_rate_incl_gst)}</td>
                            <td className={cellCls + " text-right"}>{fmt(bid.total_value_incl_gst)}</td>
                            <td className={cellCls + " text-right"}>
                              {bi === 0 && benchBid?.lpr_lsor_rate ? (
                                <>{fmt(benchBid.lpr_lsor_rate)}{benchBid.lpr_lsor_date ? <><br/><span className="text-[8pt]">({dateStr(benchBid.lpr_lsor_date)})</span></> : ''}</>
                              ) : ''}
                            </td>
                            <td className={`${cellCls} text-center font-semibold ${pctDiff && parseFloat(pctDiff) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                              {pctDiff ? (parseFloat(pctDiff) > 0 ? '+' : '') + pctDiff + '%' : ''}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className={cellCls + " font-bold text-right"}>TOTAL VALUE (WITH 18% GST)</td>
                        <td className={cellCls + " font-bold text-right"}>Rs. {fmt(schDecision?.total_order_price_incl_gst)}</td>
                        <td colSpan={2} className={cellCls}></td>
                      </tr>
                      <tr>
                        <td colSpan={3} className={cellCls + " font-bold text-right"}>TOTAL VALUE WITH 18% GST AND 25% OPTION CLAUSE</td>
                        <td className={cellCls + " font-bold text-right"}>Rs. {fmt(totalWithOC)}</td>
                        <td colSpan={2} className={cellCls}></td>
                      </tr>
                    </tfoot>
                  </table>
                  <div className="text-[9pt] text-justify mb-1">
                    <strong>BENCH MARKING-</strong> Bench marking is done on the basis of Last {benchBid?.lpr_lsor_type || 'Supply Order'} Rate
                    {benchBid?.lpr_lsor_po_no ? ' (' + benchBid.lpr_lsor_po_no + (benchBid.lpr_lsor_date ? ', dt-' + dateStr(benchBid.lpr_lsor_date) : '') + ')' : ''} price,
                    i.e. Rs. {fmt(benchBid?.lpr_lsor_rate)} (per unit w/o GST) of firm M/s {benchBid?.lpr_lsor_vendor || ''}.
                  </div>
                  <div className="text-[9pt] text-justify">
                    <strong>Rate Comparison,</strong> Price quoted by the L-1 firm i.e. M/s {l1Vendor} is
                    {(() => {
                      const l1bid = sch.bids.find(b => b.vendor_name === l1Vendor)
                      if (!l1bid?.quoted_rate_excl_gst || !benchBid?.lpr_lsor_rate) return ''
                      const pct = ((l1bid.quoted_rate_excl_gst - benchBid.lpr_lsor_rate) / benchBid.lpr_lsor_rate * 100)
                      return ` ${pct > 0 ? 'higher' : 'lower'} by ${Math.abs(pct).toFixed(2)}% from the Last ${benchBid.lpr_lsor_type || 'Supply Order'} Rate`
                    })()}
                    {benchBid?.lpr_lsor_po_no ? ' (' + benchBid.lpr_lsor_po_no + ', dt-' + dateStr(benchBid.lpr_lsor_date) + ')' : ''} price,
                    i.e. Rs. {fmt(benchBid?.lpr_lsor_rate)} (per unit w/o GST) of firm M/s {benchBid?.lpr_lsor_vendor}. Hence, the rate seems to be reasonable.
                    {benchBid?.annl_escalation ? ' The annual compounded escalation over the period is ' + benchBid.annl_escalation + '%.' : ''}
                  </div>
                </div>
              )
            })}

            {/* 5) PRICE JUSTIFICATION */}
            <p className="font-bold underline mb-1">5) PRICE JUSTIFICATION:-</p>
            <div className="mb-4 text-[9.5pt] text-justify">
              <div className="mb-1">i. The instant case is 100% OTE, in which {[...new Set(bids.map(b => b.vendor_name))].length} firms submitted their offer.</div>
              {schedules.map((sch, si) => {
                const l1bid = decisions.find(d => d.lf_no === sch.lf_no)
                const l1Vendor = l1bid?.l1_vendor || sch.bids[0]?.vendor_name
                const bench = sch.bids[0]
                const l1BidRow = sch.bids.find(b => b.vendor_name === l1Vendor)
                const pct = l1BidRow?.quoted_rate_excl_gst && bench?.lpr_lsor_rate
                  ? ((l1BidRow.quoted_rate_excl_gst - bench.lpr_lsor_rate) / bench.lpr_lsor_rate * 100)
                  : null
                const romans = ['ii','iii','iv','v','vi','vii','viii']
                return (
                  <div key={si} className="mb-1">
                    {romans[si]}. For item at schedule no.{sch.sch_no}, Price quoted by the L-1 firm i.e. M/s {l1Vendor} is
                    {pct !== null ? ` ${pct > 0 ? 'higher' : 'lower'} by ${Math.abs(pct).toFixed(2)}% from the Last ${bench?.lpr_lsor_type || 'Supply Order'} Rate` : ''}
                    {bench?.lpr_lsor_po_no ? ' (' + bench.lpr_lsor_po_no + ', dt-' + dateStr(bench.lpr_lsor_date) + ')' : ''}
                    {' '}price, i.e. Rs. {fmt(bench?.lpr_lsor_rate)} (per unit w/o GST) of firm M/s {bench?.lpr_lsor_vendor}. Hence, the rate seems to be reasonable.
                  </div>
                )
              })}
            </div>

            {/* 6) DFP */}
            <p className="font-bold underline mb-1">6) DELEGATION OF FINANCIAL POWERS:-</p>
            <p className="mb-4 text-[9.5pt] text-justify">
              The value of the present OTE case is Rs. {fmt(tpc.case_value_present)} with 18% GST & without 25% option clause which falls under the delegated financial powers of Factory level {tpcLevel} as per Amended Manual of Delegation of Financial Power of India Optel Limited, Dehradun(IOL) effective from 28/01/2026.
            </p>

            {/* 7) PROPOSAL */}
            <p className="font-bold underline mb-1">7) PROPOSAL:-</p>
            <p className="mb-2 text-[9.5pt]">In view of above details it is proposed to:-</p>
            <table className="w-full border-collapse border border-black text-[9pt] mb-4">
              <thead>
                <tr>
                  <th className={thCls + " w-16"}>SLNO</th>
                  <th className={thCls + " w-60"}>LF</th>
                  <th className={thCls}>PROPOSAL</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((sch, si) => {
                  const d = decisions.find(x => x.lf_no === sch.lf_no)
                  const bench = sch.bids[0]
                  const l1bid = sch.bids.find(b => b.vendor_name === d?.l1_vendor) || sch.bids[0]
                  const pct = l1bid?.quoted_rate_excl_gst && bench?.lpr_lsor_rate
                    ? ((l1bid.quoted_rate_excl_gst - bench.lpr_lsor_rate) / bench.lpr_lsor_rate * 100) : null
                  const proposalText = `Price quoted by the L-1 firm i.e. M/s ${d?.l1_vendor || '-'} is ${pct !== null ? (pct > 0 ? 'higher' : 'lower') + ' by ' + Math.abs(pct).toFixed(2) + '%' : ''} from the Last ${bench?.lpr_lsor_type || 'Supply Order'} Rate${bench?.lpr_lsor_po_no ? ' (' + bench.lpr_lsor_po_no + ', dt-' + dateStr(bench.lpr_lsor_date) + ')' : ''} price, i.e. Rs. ${fmt(bench?.lpr_lsor_rate)} (per unit w/o GST) of firm M/s ${bench?.lpr_lsor_vendor}. Hence, the rate seems to be reasonable.\n\nIt is proposed to place Supply order for 60% Tendered item quantity i.e ${d?.l1_qty || '-'} nos on L-1 firm i.e M/s ${d?.l1_vendor || '-'}${d?.l2_vendor ? ' and 40% Tendered item quantity i.e ' + (d.l2_qty || '-') + ' nos on L-2 firm i.e M/s ' + d.l2_vendor + ' at same price quoted by L-1 firm. If L-2 firm does not agree, the remaining 40% quantity to be covered by placing supply order on L-1 firm only.' : '.'}`
                  return (
                    <tr key={si}>
                      <td className={thCls}>SCH.{sch.sch_no}</td>
                      <td className={cellCls}>LF: {sch.lf_no}</td>
                      <td className={cellCls + " whitespace-pre-wrap"}>{proposalText}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <p className="mb-8 text-[9.5pt]">The case file is being submitted to {tpcLevel} for decision please.</p>

            {/* Member Secretary */}
            <div className="flex justify-end mb-10">
              <div className="text-center font-bold text-[10pt] w-72">
                ({tpc.prepared_by || 'MEMBER SECRETARY'})<br/>DGM/MMD-II<br/>MEMBER SECRETARY
              </div>
            </div>

            {/* 8) DELIBERATION */}
            <p className="font-bold underline mb-1">8) {tpcLevel} DELIBERATION: -</p>
            <div className="mb-6 text-[9.5pt] text-justify whitespace-pre-wrap">
              {tpc.committee_remarks || 'TPC deliberated upon the case and noted that:\n(i) The instant case is 100% OTE...'}
            </div>

            {/* 9) DECISION */}
            <p className="font-bold underline mb-1">9) {tpcLevel} DECISION:-</p>
            <p className="mb-2 text-[9.5pt]">In light of above,</p>
            <table className="w-full border-collapse border border-black text-[9pt] mb-4">
              <thead>
                <tr>
                  <th className={thCls + " w-16"}>SLNO</th>
                  <th className={thCls + " w-60"}>LF</th>
                  <th className={thCls}>DECISION</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((sch, si) => {
                  const d = decisions.find(x => x.lf_no === sch.lf_no)
                  const teQty = (d?.l1_qty || 0) + (d?.l2_qty || 0)
                  const decisionText = `It is decided to place Supply order for 60% Tendered item quantity i.e ${d?.l1_qty || '-'} nos on L-1 firm i.e M/s ${d?.l1_vendor || '-'}${d?.l2_vendor ? ' and 40% Tendered item quantity i.e ' + (d.l2_qty || '-') + ' nos on L-2 firm i.e M/s ' + d.l2_vendor + ' at same price quoted by L-1 firm. If L-2 firm does not agree, the remaining 40% quantity to be covered by placing supply order on L-1 firm only.' : '.'}\nBasic Price per unit - Rs. ${fmt(d?.basic_price_per_unit)}\nPrice per unit with 18% GST - Rs. ${fmt(d?.price_incl_gst_per_unit)}\nTotal Order Price for ${teQty} nos with 18% GST- Rs. ${fmt(d?.total_order_price_incl_gst)}`
                  return (
                    <tr key={si}>
                      <td className={thCls}>SCH.{sch.sch_no}</td>
                      <td className={cellCls}>LF: {sch.lf_no}</td>
                      <td className={cellCls + " whitespace-pre-wrap"}>{decisionText}</td>
                    </tr>
                  )
                })}
                <tr>
                  <td className={thCls}>PSD</td>
                  <td colSpan={2} className={cellCls}>3% OF SUPPLY ORDER VALUE</td>
                </tr>
                <tr>
                  <td className={thCls}>OPTION CLAUSE</td>
                  <td colSpan={2} className={cellCls}>25% OF SUPPLY ORDER VALUE</td>
                </tr>
                <tr>
                  <td className={thCls}>DELIVERY PERIOD</td>
                  <td colSpan={2} className={cellCls}>150 DAYS FROM THE DATE OF SUPPLY ORDER</td>
                </tr>
              </tbody>
            </table>

            <p className="text-[8.5pt] text-center mb-10 italic">[Undertaking is hereby given that none of under signed TPC Member has any personal interest in the companies/agencies participating in this bid]</p>

            {/* Signatures */}
            <div className="flex justify-end mb-10">
              <div className="text-center font-bold text-[10pt] w-72">
                ({tpc.prepared_by || 'MEMBER SECRETARY'})<br/>DGM/MMD-II<br/>MEMBER SECRETARY
              </div>
            </div>

            <div className="flex justify-between font-bold text-center text-[10pt] px-4 mb-10">
              <div>( )<br/>DGM/EPS<br/>MEMBER USER</div>
              <div>( )<br/>DGM/QC (I)<br/>MEMBER QC</div>
              <div>( )<br/>DGM/FINANCE<br/>MEMBER FINANCE</div>
            </div>

            <div className="flex justify-center font-bold text-center text-[10pt]">
              <div>( )<br/>CHAIRMAN</div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}



