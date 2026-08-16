'use client'
import { useState } from 'react'
import { TEC, VSL } from '../../types/procurement'

interface Props {
  onClose: () => void
  tecs: TEC[]
  vsls?: VSL[]
}

function dateStr(d: string | undefined | null) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-GB').replace(/\//g, '.') } catch { return d }
}

export default function PrintTECModal({ onClose, tecs, vsls = [] }: Props) {
  const [selectedId, setSelectedId] = useState(tecs[0]?.tec_no || '')
  const [gemBidNo, setGemBidNo] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const tec = tecs.find(t => t.tec_no === selectedId)
  
  const matchingVsl = tec ? vsls.find(v => v.vsl_no === tec.te_no || v.pre_te_no === tec.te_no) : null
  const preTe = (matchingVsl as any)?.pre_te
  const metadata = (matchingVsl as any) || {}
  
  const totalCaseVal = Number(metadata?.total_case_value || 0)
  const isPactMandatory = totalCaseVal > 50000000

  
  const totalCaseValNum = Number(metadata?.total_case_value || 0)
  const getTpcLevel = (val: number) => {
    if (val < 1000000) return 'Non-TPC Level'
    if (val < 5000000) return 'TEC-IV'
    if (val < 50000000) return 'TEC-III'
    if (val < 250000000) return 'TEC-II'
    return 'TEC-I'
  }
  const dynamicTpcLevel = getTpcLevel(totalCaseValNum)

  const caseValue = metadata?.total_case_value
    ? 'Rs. ' + Number(metadata.total_case_value).toLocaleString('en-IN', { minimumFractionDigits: 2 }) +
      ' (Including GST @ ' + (metadata.gst_per || 18) + '% with ' + (metadata.opt_cl === 'Yes' ? (metadata.opt_cl_pct || 25) : 0) + '% option Clause)'
    : 'Rs. 0.00'

  const optionClause = metadata?.opt_cl === 'Yes' ? 'Applicable @' + (metadata.opt_cl_pct || 25) + '%' : 'Not Applicable'
  const dpDays = metadata?.dp_days ? 'Delivery ' + metadata.dp_days + ' Days from the date of placement of S.O.' : 'Delivery 150 Days from the date of placement of S.O.'
  const modeProc = (metadata?.te_typ || 'OTE') + ' through GEM Customized bid.'
  const bidType = metadata?.bid_typ || 'Two Bid'
  const gstPer = metadata?.gst_per || 18
  const optPct = metadata?.opt_cl === 'Yes' ? (metadata.opt_cl_pct || 25) : 0
  const splittingApplied = metadata?.qty_dist === 'Yes'
    ? 'Yes as per para 4.11 of OFBPM-2018, depending upon TE participation as below:\na) ' + (metadata.qty_dist_ratio || '60:40') + ' (provided at least three sources were issued tenders and have also quoted) or\nb) If the L-2 Bidder does not accept the counter-offer L-1 rate then such undistributed quantity shall revert back to the L-1 Bidder'
    : 'No'

  const evals = (tec as any)?.evaluations || tec?.evaluations || []
  const techSuitable = evals.filter((e: any) => e.is_technically_suitable)

  const romNums = ['i','ii','iii','iv','v','vi','vii','viii','ix','x']

  const cellCls = "border border-black p-1 align-top"
  const thCls = "border border-black p-1 font-bold text-center"

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto print:static print:inset-auto print:overflow-visible print:bg-white print:p-0 print:block">
      <div className="bg-white rounded-xl shadow-2xl max-w-[1050px] w-full my-4 print:static print:overflow-visible print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:rounded-none">

        {/* Toolbar */}
        <div className="bg-slate-800 px-6 py-3 flex flex-wrap gap-3 justify-between items-center rounded-t-xl print:hidden sticky top-0 z-10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><i className="bi bi-printer"></i> Print TEC Document</h2>
          
          <div className="flex flex-wrap items-center gap-2">
            <input type="text" value={gemBidNo} onChange={e => setGemBidNo(e.target.value)}
              placeholder="GeM Bid No (e.g. GEM/2026/B/7342107)" 
              className="px-2 py-1.5 bg-slate-700 text-white border border-slate-600 rounded text-sm w-64 placeholder:text-slate-400" />
            <input type="text" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
              placeholder="Meeting Date (e.g. 28.07.2026)"
              className="px-2 py-1.5 bg-slate-700 text-white border border-slate-600 rounded text-sm w-48 placeholder:text-slate-400" />
            
            {tecs.length > 0 && (
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="px-3 py-1.5 bg-slate-700 text-white border border-slate-600 rounded text-sm max-w-xs truncate">
                {tecs.map(t => <option key={t.tec_no} value={t.tec_no}>{t.tec_no} - TE: {t.te_no}</option>)}
              </select>
            )}
            <button onClick={() => window.print()} className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded hover:bg-blue-500 text-sm shadow">
              <i className="bi bi-printer mr-1"></i>Print
            </button>
            <button onClick={onClose} className="px-4 py-1.5 bg-slate-600 text-white font-semibold rounded hover:bg-slate-500 text-sm">Close</button>
          </div>
        </div>

        {tecs.length === 0 ? (
          <div className="p-20 text-center print:hidden">
            <p className="text-gray-900 font-bold text-xl">No TEC records found</p>
            <p className="text-gray-500 mt-1">Create a TEC first to print it.</p>
          </div>
        ) : !tec ? (
          <div className="p-20 text-center print:hidden"><p className="font-bold text-xl">TEC not found.</p></div>
        ) : (
          <div id="printable-tec-document" className="p-10 text-black print:p-0" style={{fontFamily:'"Times New Roman", Times, serif', fontSize:'11pt', lineHeight:'1.4', backgroundColor: 'white', paddingBottom: '40px'}}>
            {/* Repeating Print Footer */}
            <div className="hidden print:block fixed bottom-0 right-0 w-full text-right italic text-[9pt] pb-2" style={{ backgroundColor: 'white' }}>
              GeM Bid No {gemBidNo || tec.te_no}, DATED {dateStr(preTe?.upd_dt)}, {dynamicTpcLevel}
            </div>


            {/* Top footer line (bottom of each page) */}
            <style>{`
              @media print { 
                body { -webkit-print-color-adjust: exact; }
                body * { visibility: hidden; }
                #printable-tec-document, #printable-tec-document * { visibility: visible; }
                #printable-tec-document { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                @page { margin: 15mm; }
              }
            `}</style>

            {/* Running footer line */}
            

            {/* HEADER */}
            <div className="text-center font-bold mb-3 leading-snug">
              <div className="text-[12pt] tracking-wide uppercase">OPTO ELECTRONICS FACTORY, DEHRADUN</div>
              <div className="text-[11pt] uppercase">MATERIAL MANAGEMENT DIRECT-2</div>
              <div className="text-[10pt] uppercase">(FULLY FINISHED GROUP)</div>
              <div className="text-[11.5pt] uppercase mt-1">BRIEF/ MINUTES OF {dynamicTpcLevel.replace("-", " LEVEL ")}</div>
              <div className="text-[10pt] uppercase">MEETING HELD ON {meetingDate || '...........................'}</div>
            </div>

            <table className="w-full border-collapse border border-black text-[10pt] mb-4">
              <tbody>
                <tr>
                  <td className={cellCls + " w-1/2"}>GEM BID NO.:- {gemBidNo || tec.te_no}</td>
                  <td className={cellCls}>TEC dt: {dateStr(tec.tec_dt)}</td>
                </tr>
                <tr>
                  <td colSpan={2} className={cellCls}>GEM BID NO. DATE:- {dateStr(preTe?.upd_dt)}</td>
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
                  ['i.', 'SUBJECT', 'OPENING OF PRICE BID'],
                  ['ii.', 'REFERENCE', 'GeM Bid No. ' + (gemBidNo || tec.te_no) + ', DATED ' + dateStr(preTe?.upd_dt) + ' (P.15-18)'],
                  ['iii.', 'TENDER NO.', gemBidNo || tec.te_no],
                  ['iv.', 'TEC LEVEL', dynamicTpcLevel],
                  ['v.', 'SCHEDULE T.o.D', tec.tender_opening_dt ? dateStr(tec.tender_opening_dt) : ''],
                  ['vi.', 'USER SECTION', (matchingVsl?.items?.[0] as any)?.user_sect || metadata?.head_cd || 'EPS'],
                  ['vii.', 'MODE OF PROCUREMENT', modeProc],
                  ['viii.', 'CASE VALUE (INITIAL)', caseValue],
                  ['ix.', 'BID VALIDITY', '180 Days'],
                  ['x.', 'EMD', 'Applicable @3% (Exemption will be given as per erstwhile OFBPM 2018)'],
                  ['xi.', 'PSD', 'Applicable @3%'],
                  ['xii.', 'OPTION CLAUSE', optionClause],
                  ['xiii.', 'SPLITTING APPLIED/NO. OF BIDDER AMONG WHICH ORDER MAY BE SPLIT/APPROTIONMENT', splittingApplied],
                  ['xiv.', 'DELIVERY PERIOD', dpDays],
                  ['xv.', 'TENDER FLOATED FOR', 'OEMs /Manufacturers'],
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
                  <td className="border border-black p-0 align-top">
                    <table className="w-full border-collapse">
                      <tbody>
                        {matchingVsl?.items?.map((item: any, idx: number) => (
                          <tr key={idx} className={idx < (matchingVsl?.items?.length || 0) - 1 ? "border-b border-black" : ""}>
                            <td className="p-1 border-r border-black w-16 align-top">SCH.{idx+1}</td>
                            <td className="p-1 border-r border-black align-top text-[10pt]">LF: {item.lf_no}<br/>{item.item_description}</td>
                            <td className="p-1 w-40 align-top">End Store:- </td>
                          </tr>
                        )) || <tr><td className="p-1">No items</td></tr>}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2) DETAILS OF ITEMS */}
            <p className="font-bold underline mb-1">2) DETAILS OF ITEMS (UNDER CONSIDERATION OF TEC):-</p>
            <table className="w-full border-collapse border border-black text-[10pt] mb-4 text-center">
              <thead>
                <tr>
                  <th className={thCls + " w-16"}>SCH. NO.</th>
                  <th className={thCls}>L.F/<br/>SPECIFICATION</th>
                  <th className={thCls + " w-24"}>PRESENT<br/>STOCK (Nos.)</th>
                  <th className={thCls + " w-20"}>TE QTY.<br/>(SET.)</th>
                  <th className={thCls + " w-32"}>LPR<br/>(Excl. Taxes)</th>
                  <th className={thCls + " w-48"}>LAST SUPPLIERS</th>
                </tr>
              </thead>
              <tbody>
                {matchingVsl?.items?.map((item: any, idx: number) => {
                  const lpr = item.unit_rate_wo_tax || item.unit_rate || 0;
                  const pastSuppliers = (item.past_suppliers || []).map((s: any) => s.party_nam || s.vendor_name).join(', ');
                  // if no past suppliers mapped, maybe it is in pending orders
                  const pendingSuppliers = (item.pending_orders || []).map((s: any) => s.vendor_name || s.party_nam).join(', ');
                  const suppliers = pastSuppliers || pendingSuppliers || (vsls.find(v=>v.vsl_no === tec.te_no || v.pre_te_no === tec.te_no)?.vendors?.find(v=>v.is_selected)?.party_nam) || '-';

                  return (
                    <tr key={idx}>
                      <td className={cellCls + " text-center font-bold"}>SCH.{idx+1}</td>
                      <td className={cellCls + " text-left"}>LF: {item.lf_no}<br/>{item.item_description}</td>
                      <td className={cellCls + " text-center"}>{item.stock_qty || '0.00'}</td>
                      <td className={cellCls + " text-center"}>{Number(item.required_qty || 0).toFixed(2)}</td>
                      <td className={cellCls + " text-center"}>{lpr ? Number(lpr).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className={cellCls}>{suppliers}</td>
                    </tr>
                  );
                }) || <tr><td colSpan={6} className={cellCls + " text-center"}>No items loaded</td></tr>}
              </tbody>
            </table>

            {/* 3) BACKGROUND */}
            <p className="font-bold underline mb-1">3) BACKGROUND OF THE CASE:-</p>
            <p className="mb-4 text-justify text-[10pt]">
              After approval of VSL TPC-II Dt:______, (P-____). The {metadata?.te_typ || 'OTE'} ({bidType}) with {optPct}% Option Clause was floated on GeM portal, with GeM Bid No. {gemBidNo || tec.te_no}, DATED {dateStr(preTe?.upd_dt)}, with Tender Opening Date {tec.tender_opening_dt ? dateStr(tec.tender_opening_dt) : ''}, with approved tender terms and conditions as mentioned in Annexure-17 through GeM custom bid in which OEMs/Manufacturers shall only be allowed to participate in the tender Enquiry with distribute condition tender qty. as per para 4.11 of OFBPM-2018, depending upon TE participation as below:<br/>
              a) 60:40 (provided at least three sources were issued tenders and have also quoted) or<br/>
              b) If the L-2 Bidder does not accept the counter-offer L-1 rate then such undistributed quantity shall revert back to the L-1 Bidder.<br/>
              The notification for participation in the Open tender enquiry was send to probable supplier on dt - _____________, (P-____).
            </p>

            {/* Running footer */}
            

            

            {/* Firms list */}
            <p className="mb-2 text-[10pt]">Following {evals.length} firms submitted their offer, against the bid. (P.20).</p>
            <div className="mb-4 ml-6 text-[10pt]">
              {evals.map((ev: any, i: number) => (
                <div key={i}>{romNums[i] || String(i+1)+'.'}. {ev.vendor_name}</div>
              ))}
            </div>

            {/* 4) OPENING OF BID */}
            <p className="font-bold mb-1">4) OPENING OF BID:-</p>
            <p className="mb-2 text-[10pt]"><span className="font-bold underline">i) TECHNICAL BID:-</span> The technical Bid of the case was opened against which following {evals.length} firms submitted their offer (P.20).</p>

            <table className="w-full border-collapse border border-black text-[10pt] mb-4">
              <thead>
                <tr>
                  <th className={thCls + " w-12"}>S. No.</th>
                  <th className={thCls + " w-60"}>Name of Firms</th>
                  <th className={thCls}>Documents / details submitted by the firm regarding experience and other certificates of the firms</th>
                </tr>
              </thead>
              <tbody>
                {evals.map((ev: any, i: number) => (
                  <tr key={i}>
                    <td className={thCls}>{i+1}.</td>
                    <td className={cellCls}>{ev.vendor_name}</td>
                    <td className={cellCls}></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* COMPLIANCE MATRIX */}
            <div className="w-full overflow-x-auto print:overflow-visible" style={{pageBreakInside: "avoid", breakInside: "avoid"}}>
              <table className="w-full border-collapse border border-black text-[8.5pt] mb-4" style={{tableLayout:'fixed'}}>
                <thead>
                  <tr>
                    <th colSpan={isPactMandatory ? 10 : 9} className={thCls + " text-[10pt]"}>Document/details submitted by the firms</th>
                  </tr>
                  <tr>
                    <th className={thCls} style={{width:'14%'}}>Name of Firms</th>
                    <th className={thCls} style={{width:'10%'}}>Compliance Statement</th>
                    <th className={thCls} style={{width:'12%'}}>Local Content cert.</th>
                    <th className={thCls} style={{width:'11%'}}>Non Disclosure Of Contract</th>
                    <th className={thCls} style={{width:'11%'}}>Non-Blacklisted certificate</th>
                    <th className={thCls} style={{width:'11%'}}>Land Border Sharing Certificate</th>
                    {isPactMandatory && <th className={thCls} style={{width:'10%'}}>Pre-Integrity Pact</th>}
                    <th className={thCls} style={{width:'10%'}}>MSME</th>
                    <th className={thCls} style={{width:'13%'}}>PARTICIPATION AS OEM/Manufacturer</th>
                    <th className={thCls} style={{width:'8%'}}>GST %</th>
                  </tr>
                </thead>
                <tbody>
                  {evals.map((ev: any, i: number) => (
                    <tr key={i}>
                      <td className={cellCls}>{ev.vendor_name}</td>
                      <td className={cellCls + " text-center"}>{ev.compliance_statement}</td>
                      <td className={cellCls + " text-center whitespace-pre-wrap"}>{ev.local_content_cert}</td>
                      <td className={cellCls + " text-center"}>{ev.nda_cert}</td>
                      <td className={cellCls + " text-center"}>{ev.non_blacklisted_cert}</td>
                      <td className={cellCls + " text-center"}>{ev.land_border_cert}</td>
                      {isPactMandatory && <td className={cellCls + " text-center"}>{ev.pre_integrity_pact}</td>}
                      <td className={cellCls + " text-center"}>{ev.msme_status}</td>
                      <td className={cellCls + " text-center"}>{ev.participation_as}</td>
                      <td className={cellCls + " text-center"}>{ev.gst_pct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Running footer */}
            

            

            {/* 5) F.O.R */}
            <p className="font-bold underline mb-1">5) F.O.R DESTINATION AND DELIVERY PERIOD:-</p>
            <table className="w-full border-collapse border border-black text-[10pt] mb-4">
              <thead>
                <tr>
                  <th className={thCls + " w-12"}>Sl. No.</th>
                  <th className={thCls}>Name of Vendor</th>
                  <th className={thCls + " w-28"}>Compliance</th>
                  <th className={thCls + " w-52"}>Vendor Remark</th>
                </tr>
              </thead>
              <tbody>
                {evals.map((ev: any, i: number) => (
                  <tr key={i}>
                    <td className={thCls}>{i+1}.</td>
                    <td className={cellCls}>{ev.vendor_name}</td>
                    <td className={cellCls + " text-center"}>YES</td>
                    <td className={cellCls}>{ev.for_destination_delivery}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 6) PRE-INTEGRITY PACT */}
            {isPactMandatory && (
              <>
                <p className="font-bold underline mb-1 uppercase">6) PRE-INTEGRITY PACT :-</p>
                <table className="w-full border-collapse border border-black text-[10pt] mb-4">
                  <thead>
                    <tr>
                      <th className={thCls + " w-12"}>Sl. No.</th>
                      <th className={thCls}>Name of Vendor</th>
                      <th className={thCls + " w-52"}>Vendor Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evals.map((ev: any, i: number) => (
                      <tr key={i}>
                        <td className={thCls}>{i+1}.</td>
                        <td className={cellCls}>{ev.vendor_name}</td>
                        <td className={cellCls + " text-center"}>{ev.pre_integrity_pact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* 7) CORRESPONDENCE */}
            <p className="font-bold underline mb-1 uppercase">{isPactMandatory ? '7' : '6'}) CORRESPONDANCE WITH THE FIRMS:-</p>
            <p className="mb-2 text-[10pt]">User section EPS has asked the clarification from the participated firms against the Pre-Qualification Criteria, vide letter no {gemBidNo || tec.te_no}, DT- ________. The clarification as follows:-</p>
            <table className="w-full border-collapse border border-black text-[10pt] mb-4">
              <thead>
                <tr>
                  <th className={thCls + " w-10"}>Sl. No.</th>
                  <th className={thCls + " w-48"}>Name of Vendor</th>
                  <th className={thCls}>USER CLARIFICATION</th>
                  <th className={thCls + " w-52"} colSpan={2}>Correspondence through emails</th>
                </tr>
              </thead>
              <tbody>
                {evals.map((ev: any, i: number) => (
                  <tr key={i}>
                    <td className={thCls}>{i+1}.</td>
                    <td className={cellCls}>{ev.vendor_name}</td>
                    <td className={cellCls + " whitespace-pre-wrap"} colSpan={3}>{ev.clarifications || 'NO CLARIFICATION'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Running footer */}
            

            

            {/* 8) TECHNICAL ACCEPTABILITY */}
            <p className="font-bold underline mb-1 uppercase">{isPactMandatory ? '8' : '7'}) TECHNICAL ACCEPTABILITY OF PARTICIPATED FIRMS:-</p>
            <table className="w-full border-collapse border border-black text-[10pt] mb-4">
              <thead>
                <tr>
                  <th className={thCls + " w-10"}>Sl. No.</th>
                  <th className={thCls + " w-44"}>Name of firm (M/s.)</th>
                  <th className={thCls + " w-32"}>EMD Submitted</th>
                  <th className={thCls + " w-56"}>Registration With OFB Unit</th>
                  <th className={thCls}>User Section Remarks on PRE-Qualification criteria and Technically Suitability.</th>
                </tr>
              </thead>
              <tbody>
                {evals.map((ev: any, i: number) => (
                  <tr key={i}>
                    <td className={thCls}>{i+1}.</td>
                    <td className={cellCls}>{ev.vendor_name}</td>
                    <td className={cellCls}>{ev.emd_status}</td>
                    <td className={cellCls}>{ev.registration_with_ofb}</td>
                    <td className={cellCls}>{ev.user_section_remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 9) DFP */}
            <p className="font-bold underline mb-1 uppercase">{isPactMandatory ? '9' : '8'}) DELEGATION OF FINANCIAL POWERS:-</p>
            <p className="mb-4 text-[10pt] text-justify">
              The original value of the present case is {caseValue} which falls under the delegated financial powers of Factory level {dynamicTpcLevel} as per Amended Manual of Delegation of Financial Power of India Optel Limited, Dehradun(IOL) effective from 28/01/2026.
            </p>

            {/* 10) PROPOSAL */}
            <p className="font-bold underline mb-1 uppercase">{isPactMandatory ? '10' : '9'}) PROPOSAL:-</p>
            <div className="ml-4 mb-2 text-[10pt]">
              <p className="mb-1">In view of above details it is proposed to: -</p>
              <p className="mb-2">(i) It is proposed to open the price bid of below {evals.length} participating firms, since <strong>considered technically suitable</strong> which conforms to bid T&C for the instant case.</p>
              <div className="flex justify-center mb-4">
                <table className="border-collapse border border-black w-2/3">
                  <tbody>
                    {evals.map((ev: any, i: number) => (
                      <tr key={i}>
                        <td className="border border-black p-1 w-10 text-center">{i+1}.</td>
                        <td className="border border-black p-1">{ev.vendor_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mb-4">The case file is being submitted to {dynamicTpcLevel} for decision please.</p>
            </div>

            {/* Member Secretary signature */}
            <div className="flex justify-end mb-6">
              <div className="text-center font-bold w-64 text-[10pt]">
                (SHEETANSHU TIWARI)<br/>DGM/MMD-II<br/>MEMBER SECRETARY
              </div>
            </div>

            {/* Running footer */}
            

            

            {/* 11) DELIBERATION */}
            <p className="font-bold underline mb-1 uppercase">{isPactMandatory ? '11' : '10'}) TEC L-II DELIBERATION:</p>
            <div className="ml-4 mb-4 text-[10pt] text-justify whitespace-pre-wrap">{tec.committee_remarks || 'TEC deliberated upon the case and noted that:\ni. ...\nii. ...'}</div>

            {/* 12) DECISION */}
            <p className="font-bold underline mb-1 uppercase">{isPactMandatory ? '12' : '11'}) TEC L-II DECISION:-</p>
            <div className="ml-4 mb-4 text-[10pt]">
              <p className="mb-1">In view of above details it is decided to: -</p>
              <p className="mb-2">(i) It is decided to open the price bid of below {techSuitable.length || evals.length} participating firms, since <strong>considered technically suitable</strong> which conforms to bid T&C for the instant case.</p>
              <div className="flex justify-center mb-6">
                <table className="border-collapse border border-black w-2/3">
                  <tbody>
                    {(techSuitable.length > 0 ? techSuitable : evals).map((ev: any, i: number) => (
                      <tr key={i}>
                        <td className="border border-black p-1 w-10 text-center">{i+1}.</td>
                        <td className="border border-black p-1">{ev.vendor_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Undertaking */}
            <p className="text-[8.5pt] text-center mb-10 italic">[Undertaking is hereby given that none of under signed TPC Member has any personal interest in the companies/agencies participating in this bid]</p>

            {/* Member Secretary */}
            <div className="flex justify-end mb-8">
              <div className="text-center font-bold w-64 text-[10pt]">
                (SHEETANSHU TIWARI)<br/>DGM/MMD-II<br/>MEMBER SECRETARY
              </div>
            </div>

            {/* 3-member row */}
            <div className="flex justify-between font-bold text-center px-4 mb-10 text-[10pt]">
              <div>(RAJESH RAYPA)<br/>GM /RR<br/>MEMBER QC</div>
              <div>(BHASKAR TIWARI)<br/>DGM/ EPS<br/>MEMBER USER</div>
              <div>(GUPTESHWAR RAI)<br/>DGM/FINANCE<br/>MEMBER FINANCE</div>
            </div>

            {/* Chairman */}
            <div className="flex justify-center font-bold text-center text-[10pt]">
              <div>(KANCHAN MALLICK)<br/>GM/KM<br/>CHAIRMAN</div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
