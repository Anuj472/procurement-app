'use client'
import { useState, useEffect } from 'react'
import { VSL } from '../../types/procurement'
import { createBrowser as createClient } from '../../lib/supabse/client'

interface Props {
  onClose: () => void
  vsls: VSL[]
}

export default function PrintVSLModal({ onClose, vsls }: Props) {
  const [selectedId, setSelectedId] = useState(vsls[0]?.id || '')
  const [poDetails, setPoDetails] = useState<any>({})
  const vsl = vsls.find(v => v.id === selectedId)

  // Derived values
  const teTyp = (vsl as any)?.pre_te?.te_typ || (vsl as any)?.te_typ || 'LTE'
  const isOTE = teTyp === 'OTE'
  const isSTE = teTyp === 'STE'
  const preTeNo = (vsl as any)?.pre_te_no || vsl?.vsl_no || ''
  const dateStr = vsl?.vsl_dt || new Date().toISOString().split('T')[0]
  const items = vsl?.items || []
  
  // Vendors: For STE, it should be the single selected vendor
  const lteFirms = vsl?.vendors?.filter(v => v.is_selected) || []
  
  const totalCaseValue = Number((vsl as any)?.total_case_value || (vsl as any)?.pre_te?.total_case_value || 0)
  
  // Calculate dynamic TPC Level
  const getTpcLevel = (val: number) => {
    if (val < 1000000) return 'Non-TPC Level'
    if (val < 5000000) return 'TPC Level-IV'
    if (val < 50000000) return 'TPC Level-III'
    if (val < 250000000) return 'TPC Level-II'
    return 'TPC Level-I'
  }
  const tpcLevel = getTpcLevel(totalCaseValue)

  const lteTotal = (vsl as any)?.lte_case_value || (vsl as any)?.pre_te?.lte_case_value || items.reduce((acc, it) => acc + ((it as any).lte_qty || 0) * ((it as any).unit_rate || (it as any).unit_rate_wo_tax || 0) * 1.25 * 1.18, 0);
  const sdoteTotal = (vsl as any)?.sdote_case_value || (vsl as any)?.pre_te?.sdote_case_value || items.reduce((acc, it) => acc + ((it as any).sdote_qty || 0) * ((it as any).unit_rate || (it as any).unit_rate_wo_tax || 0) * 1.18, 0);

  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    const fetchPoData = async () => {
      if (items.length === 0) return
      
      const supabase = createClient()
      const lfNos = items.map(it => it.lf_no)
      
      const { data, error } = await supabase
        .from('po_order')
        .select('po_no, po_dt, party_cd, lf_no, m_party(party_nam)')
        .in('lf_no', lfNos)
        .order('po_dt', { ascending: false })

      if (error) {
        console.error("Error fetching PO data:", error)
        return
      }
      
      const poMap: any = {}
      lfNos.forEach(lf => {
        const allPos = data?.filter((d: any) => d.lf_no === lf)
        if (allPos && allPos.length > 0) poMap[lf] = allPos
      })
      setPoDetails(poMap)
    }
    
    fetchPoData()
  }, [selectedId, items])

  const handlePrint = () => {
    const printContent = document.getElementById('vsl-print-document');
    if (printContent) {
      const htmlToPrint = printContent.outerHTML;
      const printWindow = window.open('', '_blank', 'height=800,width=1000');
      if (!printWindow) return;
      printWindow.document.write(`
        <html>
          <head>
            <title>Print VSL Document</title>
            <style>
              body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: black; margin: 0; background: white; -webkit-print-color-adjust: exact; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 16px; table-layout: fixed; }
              th, td { border: 1px solid black; padding: 4px 6px; text-align: left; vertical-align: top; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              h1, h2, h3, h4, h5, h6 { margin-top: 0; margin-bottom: 10px; text-align: center; font-weight: bold; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .underline { text-decoration: underline; }
              .mb-2 { margin-bottom: 8px; }
              .mb-4 { margin-bottom: 16px; }
              .mt-4 { margin-top: 16px; }
              .mt-8 { margin-top: 32px; }
              p { margin: 0 0 8px 0; text-align: justify; }
            </style>
          </head>
          <body>
            ${htmlToPrint}
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
  }

  if (!vsls || vsls.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <i className="bi bi-exclamation-triangle-fill text-amber-500 text-5xl mb-4 block"></i>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No VSLs Available</h2>
          <p className="text-gray-600 mb-6">Create a VSL first before trying to print.</p>
          <button onClick={onClose} className="px-6 py-2.5 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition-all w-full">
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-start justify-center z-50 p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl flex flex-col my-4">
        
        {/* Controls Toolbar (Non-printable) */}
        <div className="bg-slate-100 p-4 border-b border-gray-300 flex items-center justify-between rounded-t-xl shrink-0 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <i className="bi bi-printer-fill text-indigo-600"></i>
              Print VSL Document
            </h2>
            <select 
              value={selectedId} 
              onChange={e => setSelectedId(e.target.value)}
              className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-w-[250px] font-semibold"
            >
              {vsls.map(v => (
                <option key={v.id} value={v.id}>{(v as any).pre_te_no || v.vsl_no} ?" {v.vsl_dt}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm shadow-indigo-200">
              <i className="bi bi-printer"></i> Print Document
            </button>
            <button onClick={onClose} className="px-6 py-2.5 border-2 border-gray-400 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-all">
              Close
            </button>
          </div>
        </div>

        {/* Print Preview Container (Looks like A4) */}
        <div className="p-8 bg-gray-200 overflow-y-auto flex-1 flex justify-center">
          <div 
            id="vsl-print-document" 
            className="bg-white shadow-lg mx-auto" 
            style={{ width: '210mm', minHeight: '297mm', padding: '20mm', fontFamily: '"Times New Roman", Times, serif', fontSize: '11pt', color: 'black' }}
          >
            
            {/* SINGLE KNOWN SOURCE CERTIFICATES (STE Only) - AT THE BEGINNING */}
            {isSTE && items.map((it, idx) => {
              const vendorName = lteFirms[0]?.party_nam || (poDetails[it.lf_no]?.[0]?.m_party?.party_nam || 'UNKNOWN FIRM');
              const poNo = poDetails[it.lf_no]?.[0]?.po_no || 'OLF/MM2/S-UNKNOWN';
              const poDt = poDetails[it.lf_no]?.[0]?.po_dt || 'UNKNOWN DATE';
              
              const itemSteQty = (it as any).lte_qty || Math.round((it.required_qty || 0) * 0.8);
              const itemSdoteQty = (it as any).sdote_qty || Math.round((it.required_qty || 0) * 0.2);
              
              const lteVal = itemSteQty * ((it as any).unit_rate_wo_tax || (it as any).unit_rate || 0) * 1.25 * 1.18;
              const sdoteVal = itemSdoteQty * ((it as any).unit_rate_wo_tax || (it as any).unit_rate || 0) * 1.18;
              const itemTotalVal = lteVal + sdoteVal;

              return (
                <div key={`cert-${idx}`} style={{ pageBreakAfter: "always", breakAfter: "page", marginBottom: "40px" }}>
                  <div className="text-center font-bold text-lg mb-1 uppercase underline">OPTO ELECTRONICS FACTORY, DEHRADUN</div>
                  <div className="text-center font-bold text-base mb-6 uppercase underline">MATERIAL MANAGEMENT DIRECT</div>
                  
                  <div className="flex justify-between font-bold mb-8">
                    <div>No: {preTeNo}</div>
                    <div>DATED: {dateStr}</div>
                  </div>
                  
                  <div className="text-center font-bold text-lg mb-6 underline uppercase">SINGLE KNOWN SOURCE CERTIFICATE</div>
                  
                  <table className="w-full text-sm mb-6 border border-black" style={{border: 'none'}}>
                    <tbody style={{border: 'none'}}>
                      <tr>
                        <td className="w-8 border border-black p-2 font-bold">1</td>
                        <td className="w-64 border border-black p-2 font-bold">Nomenclature of Item</td>
                        <td className="w-4 border border-black p-2 font-bold text-center">:</td>
                        <td className="border border-black p-2">{it.item_description}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold">2</td>
                        <td className="border border-black p-2 font-bold">Specification of Item</td>
                        <td className="border border-black p-2 font-bold text-center">:</td>
                        <td className="border border-black p-2">{it.lf_no} (LF)<br/>{it.item_description}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold">3</td>
                        <td className="border border-black p-2 font-bold">Total SHIS Quantity</td>
                        <td className="border border-black p-2 font-bold text-center">:</td>
                        <td className="border border-black p-2">{(it.required_qty || 0) + ((it as any).stock_qty || 0)} Nos.</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold">4</td>
                        <td className="border border-black p-2 font-bold">Total required Quantity</td>
                        <td className="border border-black p-2 font-bold text-center">:</td>
                        <td className="border border-black p-2">{it.required_qty || 0} Nos.</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold">5</td>
                        <td className="border border-black p-2 font-bold">Total required Quantity proposed for procurement through SKS (with 25% Option Clause):</td>
                        <td className="border border-black p-2 font-bold text-center">:</td>
                        <td className="border border-black p-2">{itemSteQty} Nos. (80% of total required quantity)</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold">6</td>
                        <td className="border border-black p-2 font-bold">Quantity proposed for procurement through SDOTE (without Option Clause)</td>
                        <td className="border border-black p-2 font-bold text-center">:</td>
                        <td className="border border-black p-2">{itemSdoteQty} Nos. (20% of total required Qty)</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold">7</td>
                        <td className="border border-black p-2 font-bold">End Use</td>
                        <td className="border border-black p-2 font-bold text-center">:</td>
                        <td className="border border-black p-2"></td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold">8</td>
                        <td className="border border-black p-2 font-bold">Name and address of the Firm:</td>
                        <td className="border border-black p-2 font-bold text-center">:</td>
                        <td className="border border-black p-2 uppercase font-bold">{vendorName}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold">9</td>
                        <td colSpan={3} className="border border-black p-2 text-justify">
                          The item under consideration is Made to Order (MTO) electronic items i.e. cable/harness.<br/>
                          It is certified that the indented item has been developed and successfully supplied by firm M/s <span className="font-bold">{vendorName}</span> against Supply Order No. <span className="font-bold">{poNo}</span> dated <span className="font-bold">{poDt}</span> (through OTE). The firm has successfully supplied the complete ordered quantity of the item i.e {itemSteQty} Nos. to OLF and said firm is the only known, registered and established manufacturer source as on date for the said Component.
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold">10</td>
                        <td className="border border-black p-2 font-bold">The action(s) taken for development of more sources and its/their present status is as follows:</td>
                        <td className="border border-black p-2 font-bold text-center">:</td>
                        <td className="border border-black p-2 text-justify">
                          Previously, S.O. was placed on M/s <span className="font-bold">{vendorName}</span> and the firm has successfully supplied the complete ordered quantity to OLF.<br/><br/>
                          Since the present requirement is for {it.required_qty} Nos., only {itemSteQty} Nos. is planned to be procured through SKS basis. The action for development of more sources will be taken through Source Development Open Tender Enquiry for {itemSdoteQty} Nos. (i.e 20% of total required Quantity).
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold">11</td>
                        <td className="border border-black p-2 font-bold">Approximate value of the Item (STE+SDOTE)</td>
                        <td className="border border-black p-2 font-bold text-center">:</td>
                        <td className="border border-black p-2">INR {fmt(itemTotalVal)}/- for STE (incl. GST @18% & OC @25%) and SD-OTE (incl. GST @18%).</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <div className="flex justify-between mt-12 px-8">
                    <div className="text-center font-bold">__________<br/>CO/MM</div>
                    <div className="text-center font-bold">__________<br/>GO/MM</div>
                    <div className="text-center font-bold">___________<br/>CO/USER</div>
                    <div className="text-center font-bold">___________<br/>GO/USER</div>
                  </div>
                  
                  <div className="mt-12 ml-16 font-bold">
                    ____________________<br/>FINANCE MEMBER
                  </div>
                  
                  <div className="mt-8 ml-16 font-bold">
                    APPROVED/NOT APPROVED
                  </div>
                  
                  <div className="mt-12 text-center font-bold">
                    ___________________________________<br/>CHIEF GENERAL MANAGER
                  </div>
                </div>
              );
            })}


            {/* VSL MAIN DOCUMENT HEADER */}
            <h2 className="text-center font-bold text-lg mb-1">OPTO ELECTRONICS FACTORY</h2>
            <h3 className="text-center font-bold text-base mb-1 underline">MATERIAL MANAGEMENT-D</h3>
            <h3 className="text-center font-bold text-base mb-6 underline uppercase">
              MINUTES/BRIEF OF VENDOR SELECTION {tpcLevel} as per Case Value
            </h3>

            <div className="flex justify-between font-bold mb-6 text-sm">
              <div>NO: {preTeNo}</div>
              <div>DATED: {dateStr}</div>
            </div>

            <div className="mb-6 font-bold text-sm text-justify">
              SUB: APPROVAL FOR ISSUE OF {isOTE ? 'OTE (100% TENDERED QUANTITIES)' : `${teTyp} (80% TENDERED QUANTITIES) & SDOTE (20 % TENDERED QUANTITIES)`} FOR PROCUREMENT OF 
              {items.map((it, idx) => ` ${it.item_description} (${it.lf_no})${idx < items.length - 1 ? ',' : ''}`)}
            </div>

            {/* 1. Details of requirements */}
            <div className="font-bold mb-2">1. Details of requirements of stores are as under:</div>
            <table className="w-full border-collapse border border-black text-sm mb-6">
              <thead>
                <tr>
                  <th className="border border-black p-1 text-center">NOMENCLATURE (LF)</th>
                  <th className="border border-black p-1 text-center">SHIS QTY</th>
                  <th className="border border-black p-1 text-center">Qty. To be Procured</th>
                  <th className="border border-black p-1 text-center">UNIT COST BASIC (LSoR)</th>
                  <th className="border border-black p-1 text-center">VALUE (RS.)</th>
                  <th className="border border-black p-1 text-center">LAST SUPPLIER</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-1 w-1/4">
                      <div>{it.item_description}</div>
                      <div className="mt-1 font-bold">LF: {it.lf_no}</div>
                    </td>
                    <td className="border border-black p-1 text-center text-xs w-1/6">
                      {((it as any).shis_details && (it as any).shis_details.length > 0) ? (
                        <div className="flex flex-col gap-1">
                          {(it as any).shis_details.map((sh: any, si: number) => (
                            <div key={si} className="border border-gray-300 p-1">
                              <div>{sh.shis_no}</div>
                              <div>{sh.shis_dt}</div>
                              <div className="font-bold">{sh.qty}</div>
                            </div>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="border border-black p-1 text-center font-bold w-32">
                      {it.required_qty} Nos.
                    </td>
                    <td className="border border-black p-1 text-right">
                      Rs. {fmt((it as any).unit_rate_wo_tax || (it as any).unit_rate || 0)}
                    </td>
                    <td className="border border-black p-1 text-right">
                      {fmt(it.required_qty * ((it as any).unit_rate_wo_tax || (it as any).unit_rate || 0))}
                    </td>
                    <td className="border border-black p-1 w-1/5">
                        <div className="flex flex-col gap-2 text-[8.5pt]">
                          {poDetails[it.lf_no] && poDetails[it.lf_no].length > 0 ? (
                            Array.from(new Set(poDetails[it.lf_no].map((p: any) => p.m_party?.party_nam || p.party_cd).filter(Boolean))).map((name: any, vi: number) => (
                              <div key={vi}>{name}</div>
                            ))
                          ) : ((it as any).past_suppliers || []).length > 0 ? (
                            ((it as any).past_suppliers).map((v: any, vi: number) => (
                              <div key={vi}>{v.party_nam || v.vendor_name}</div>
                            ))
                          ) : (
                            <div>-</div>
                          )}
                        </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 2. Background */}
            <div className="mb-6">
              <span className="font-bold">2. Background of the case:</span> The items fall under the category of Made to Order electronics item. They were successfully procured previously from established sources. All firms have successfully supplied the complete order quantities to OLF.
            </div>

            {/* 3. Pending Orders */}
            <div className="font-bold mb-2">3. Pending Supply Orders:</div>
            <p className="mb-2">The following supply orders are pending:</p>
            <table className="w-full border-collapse border border-black text-sm mb-6">
              <thead>
                <tr>
                  <th className="border border-black p-1 text-center">PO No.</th>
                  <th className="border border-black p-1 text-center">PO Date</th>
                  <th className="border border-black p-1 text-center">Vendor</th>
                  <th className="border border-black p-1 text-center">Outstanding Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.flatMap(it => (it as any).pending_orders || []).map((po: any, pidx: number) => (
                  <tr key={pidx}>
                    <td className="border border-black p-1 text-center">{po.po_no}</td>
                    <td className="border border-black p-1 text-center">{po.po_dt}</td>
                    <td className="border border-black p-1 text-center">{po.vendor_name || po.party_nam}</td>
                    <td className="border border-black p-1 text-center">{po.outstanding_qty}</td>
                  </tr>
                ))}
                {items.flatMap(it => (it as any).pending_orders || []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="border border-black p-1 text-center">NIL</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* 4. Condition */}
            <div className="mb-6 text-justify">
              <span className="font-bold">4. Condition for MTO Items as per OFBPM 2018:</span> The tendered item is Made to Order electronics item. As per clause 2.26(vi) & (vii) of OFBPM-2018:
              
              {!isOTE ? (
                <>
                  <br/><br/>
                  ? 80% of the net deficiency shall be procured, with a 25% option clause, through {teTyp} issued to only established sources with valid registration.
                  <br/>
                  ? Balance 20% of the net deficiency shall be procured, without option clause through SDOTE following a two-bid system where established sources shall not be allowed to participate.
                </>
              ) : (
                <>
                  <br/><br/>
                  ? 100% of the net deficiency shall be procured through OTE open to all eligible bidders without option clause by default.
                </>
              )}
            </div>

            {/* 80% Breakdown */}
            <div className="font-bold mb-2">5. {isOTE ? 'OTE' : teTyp}: For {isOTE ? '100%' : '80%'} of required quantity</div>
            {items.map((it, idx) => (
              <table key={idx} className="w-full border-collapse border border-black text-sm mb-2">
                <thead>
                  <tr>
                    <th colSpan={4} className="border border-black p-1 text-left font-normal">
                      For {isOTE ? '100%' : '80%'} of {it.item_description} (LF: {it.lf_no})
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-black p-1 text-center">Provisioning Qty</th>
                    <th className="border border-black p-1 text-center">Unit Price (w/o tax)</th>
                    <th className="border border-black p-1 text-center">Total Price {(vsl as any)?.pre_te?.opt_cl === 'Yes' ? `with ${(vsl as any)?.pre_te?.opt_cl_pct || 25}% option clause` : '(w/o tax)'}</th>
                    <th className="border border-black p-1 text-center">Total Price {(vsl as any)?.pre_te?.opt_cl === 'Yes' ? `with ${(vsl as any)?.pre_te?.opt_cl_pct || 25}% option clause` : ''} & {(vsl as any)?.pre_te?.gst_per || 18}% GST</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1 text-center">{(it as any).lte_qty} Nos.</td>
                    <td className="border border-black p-1 text-right">{fmt((it as any).unit_rate_wo_tax || (it as any).unit_rate || 0)}</td>
                    <td className="border border-black p-1 text-right">
                      {fmt(((it as any).lte_qty) * ((it as any).unit_rate_wo_tax || (it as any).unit_rate || 0) * ((vsl as any)?.pre_te?.opt_cl === 'Yes' ? (1 + ((vsl as any)?.pre_te?.opt_cl_pct || 25)/100) : 1))}
                    </td>
                    <td className="border border-black p-1 text-right font-bold">
                      {fmt(((it as any).lte_qty) * ((it as any).unit_rate_wo_tax || (it as any).unit_rate || 0) * ((vsl as any)?.pre_te?.opt_cl === 'Yes' ? (1 + ((vsl as any)?.pre_te?.opt_cl_pct || 25)/100) : 1) * (1 + ((vsl as any)?.pre_te?.gst_per || 18)/100))}
                    </td>
                  </tr>
                </tbody>
              </table>
            ))}
            <div className="font-bold text-right mb-6">Total case value {isOTE ? 'OTE' : teTyp} ({(vsl as any)?.pre_te?.gst_per || 18}% GST {(vsl as any)?.pre_te?.opt_cl === 'Yes' ? `+ ${(vsl as any)?.pre_te?.opt_cl_pct || 25}% O.C.` : ''}) = Rs. {fmt(lteTotal)}</div>

            {/* 20% Breakdown */}
            {!isOTE && (
              <>
                <div className="font-bold mb-2">6. SD-OTE: For 20% of required quantity</div>
                {items.map((it, idx) => (
                  <table key={idx} className="w-full border-collapse border border-black text-sm mb-2">
                    <thead>
                      <tr>
                        <th colSpan={4} className="border border-black p-1 text-left font-normal">
                          For 20% of {it.item_description} (LF: {it.lf_no})
                        </th>
                      </tr>
                      <tr>
                        <th className="border border-black p-1 text-center">Provisioning Qty</th>
                        <th className="border border-black p-1 text-center">Unit Price (w/o tax)</th>
                        <th className="border border-black p-1 text-center">Total Price (w/o tax)</th>
                        <th className="border border-black p-1 text-center">Total Price (Including {(vsl as any)?.pre_te?.gst_per || 18}% Tax)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black p-1 text-center">{(it as any).sdote_qty} Nos.</td>
                        <td className="border border-black p-1 text-right">{fmt((it as any).unit_rate_wo_tax || (it as any).unit_rate || 0)}</td>
                        <td className="border border-black p-1 text-right">{fmt(((it as any).sdote_qty) * ((it as any).unit_rate_wo_tax || (it as any).unit_rate || 0))}</td>
                        <td className="border border-black p-1 text-right font-bold">
                          {fmt(((it as any).sdote_qty) * ((it as any).unit_rate_wo_tax || (it as any).unit_rate || 0) * (1 + ((vsl as any)?.pre_te?.gst_per || 18)/100))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ))}
                <div className="font-bold text-right mb-2">Total case value SDOTE ({(vsl as any)?.pre_te?.gst_per || 18} % GST) = Rs. {fmt(sdoteTotal)}</div>
              </>
            )}

            <div className="font-bold text-center border-t border-black pt-2 mb-6">
              Total case value {isOTE ? 'OTE' : `${teTyp} (18 % GST + 25 % O.C.) + SDOTE (18 % GST)`} = Rs. {fmt(totalCaseValue)}
            </div>

            {/* Information Grid */}
            <table className="w-full border-collapse border border-black text-sm mb-6">
              <tbody>
                <tr>
                  <td className="border border-black p-2 font-bold w-1/3">7. Mode of Tendering</td>
                  <td className="border border-black p-2">{isOTE ? `OPEN TENDER (${(vsl as any)?.pre_te?.bid_typ || 'Single Bid'})` : `${teTyp === 'STE' ? 'SINGLE' : 'LIMITED'} TENDER (TWO BID) & SOURCE DEVELOPMENT OTE (TWO BID)`}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold">8. Any other procurement action in pipeline</td>
                  <td className="border border-black p-2">NIL</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold">9. Details of IFD/Indent</td>
                  <td className="border border-black p-2">As per MP sheet attached.</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold">10. Financial Powers</td>
                  <td className="border border-black p-2">As per delegation of Financial Power issued by IOL on 02.08.2023 (updated time to time) ?" 1a - Procurement of Stores from Indigenous Sources/Foreign Sources...</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold">11. Competent Financial Authority of the Case</td>
                  <td className="border border-black p-2">GM</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold">12. Expenditure Head</td>
                  <td className="border border-black p-2">{(vsl as any)?.pre_te?.head_cd || '806/01'}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold">13. Cash Flow</td>
                  <td className="border border-black p-2">The anticipated cash flow will be in FY {(vsl as any)?.pre_te?.fin_yr || '2026-27'}. Funds will be made as per the requirement.</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold">14. Case value</td>
                  <td className="border border-black p-2">The case value ({isOTE ? 'OTE' : `${teTyp}+SDOTE`}) is Rs. {fmt(totalCaseValue)}/- which falls under the delegated financial powers of Fy. {tpcLevel}.</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold">15. EMD and other T&C</td>
                  <td className="border border-black p-2">EMD & other important term and conditions will be fixed as per annex 17, as given below.</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold">16. Requirements</td>
                  <td className="border border-black p-2">SHIS was initiated by Central Planning/TPS Section. On the basis of LsoR vetted by GO/Concerned Section...</td>
                </tr>
              </tbody>
            </table>

            {/* ANNEXURE 17 */}
            <h4 className="text-center font-bold underline mb-4">ANNEXURE-17<br/>IMPORTANT TERMS & CONDITIONS TO BE DECIDED BY THE VSL TPC BEFORE FLOATING OF TENDER ENQUIRY</h4>
            <table className="w-full border-collapse border border-black text-sm mb-6">
              <thead>
                <tr>
                  <th className="border border-black p-1 text-center w-12">Sl.No</th>
                  <th className="border border-black p-1 text-center w-1/4">TERM</th>
                  <th className="border border-black p-1 text-center">OPTIONS</th>
                  <th className="border border-black p-1 text-center w-1/3">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">1</td>
                  <td className="border border-black p-1 font-bold">Type of TE</td>
                  <td className="border border-black p-1">GTE OTE (All bidders including established sources allowed) SDOTE (Established sources not allowed)<br/>LTE (Established and registered sources allowed)STE</td>
                  <td className="border border-black p-1">{isOTE ? 'OTE (100% SHIS QUANTITY)' : `${teTyp} (FOR 80% SHIS QUANTITY)\nSDOTE (FOR 20% SHIS QUANTITY)`}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">2</td>
                  <td className="border border-black p-1 font-bold">Type of Bid</td>
                  <td className="border border-black p-1">Single Bid/Two Bid</td>
                  <td className="border border-black p-1">{(vsl as any)?.pre_te?.bid_typ === 'Double Bid' ? '02-BID' : '01-BID'}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">3</td>
                  <td className="border border-black p-1 font-bold">Tender Fee</td>
                  <td className="border border-black p-1">Applicable/Not-Applicable If applicable, then amount</td>
                  <td className="border border-black p-1">Not-Applicable</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">4</td>
                  <td className="border border-black p-1 font-bold">EMD Amount (3%)</td>
                  <td className="border border-black p-1 font-bold">Applicable/Not-Applicable If applicable, then amount</td>
                  <td className="border border-black p-1 text-center italic">Applicable (3%)<br/>(Exemption will be given as per OFBPM 2018)</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">5</td>
                  <td className="border border-black p-1 font-bold">PSD</td>
                  <td className="border border-black p-1 font-bold">Applicable/Not-Applicable If applicable, then amount</td>
                  <td className="border border-black p-1 text-center font-bold italic underline">Applicable (3%)<br/>(on S.O value Rs. 10 lakh or above)</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">6</td>
                  <td className="border border-black p-1 font-bold">Option clause</td>
                  <td className="border border-black p-1 font-bold">Applicable/Not-Applicable If applicable, then proportion ( 25 %)</td>
                  <td className="border border-black p-1">{(vsl as any)?.pre_te?.opt_cl === 'Yes' ? `Applicable (${(vsl as any)?.pre_te?.opt_cl_pct || 25}%) for ${teTyp} only` : 'Not-Applicable'}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">7</td>
                  <td className="border border-black p-1 font-bold">Pre-Bid Conference</td>
                  <td className="border border-black p-1">Yes/No If yes, then date</td>
                  <td className="border border-black p-1">NO</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">8</td>
                  <td className="border border-black p-1 font-bold">Pre-contract Integrity Pact</td>
                  <td className="border border-black p-1 font-bold">Applicable/Not-Applicable If applicable, then amount & name of IEM</td>
                  <td className="border border-black p-1 text-center italic">Applicable<br/>(for case Value more than INR 5 Cr.)</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">9</td>
                  <td className="border border-black p-1 font-bold">Inspection type</td>
                  <td className="border border-black p-1">PDI followed by JRI (Normally in import cases) PDI at firm's premises and final inspection at Buyer's premises<br/><span className="font-bold">Final inspection at Buyer's premise</span></td>
                  <td className="border border-black p-1">Final inspection at Buyer's Premises</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">10</td>
                  <td className="border border-black p-1 font-bold">Inspection Authority</td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1">Chief General Manager/OITC</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">11</td>
                  <td className="border border-black p-1 font-bold">Inspection officer</td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1">CGM/OITC/OLF or his authorised representative</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">12</td>
                  <td className="border border-black p-1 font-bold">Price variation clause</td>
                  <td className="border border-black p-1">Applicable/Not-Applicable If applicable, then - Text of PV formula</td>
                  <td className="border border-black p-1">Not Applicable</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">13</td>
                  <td className="border border-black p-1 font-bold">Distribution of tender quantity</td>
                  <td className="border border-black p-1">NO<br/>60:40<br/>50:30:20</td>
                  <td className="border border-black p-1 font-bold underline">{teTyp}: {((vsl as any)?.pre_te?.qty_dist === 'Yes') ? ((vsl as any)?.pre_te?.qty_dist_ratio || 'YES') : 'NO'}<br/>SDOTE: NO</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">14</td>
                  <td className="border border-black p-1 font-bold">Delivery<br/>a) MODE<br/>b) TERMS<br/>c) SCHEDULE</td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 font-bold">For {teTyp} : {(vsl as any)?.pre_te?.dp_days || 180} days<br/>For SDOTE : {(vsl as any)?.pre_te?.dp_days || 180} days</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">15</td>
                  <td className="border border-black p-1 font-bold">Public Procurement (Preference to Make in India), Order 2017</td>
                  <td className="border border-black p-1 font-bold">Applicable/Not-Applicable If not applicable, then reason with justification</td>
                  <td className="border border-black p-1">Applicable</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">16</td>
                  <td className="border border-black p-1 font-bold">Public Procurement for MSEs Order 2012</td>
                  <td className="border border-black p-1 font-bold">Applicable/Not-Applicable If not applicable, then reason with justification</td>
                  <td className="border border-black p-1">Applicable</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">17</td>
                  <td className="border border-black p-1 font-bold">Conflict of Interest Clause</td>
                  <td className="border border-black p-1 font-bold">Applicable/Not-Applicable</td>
                  <td className="border border-black p-1">Applicable</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">18</td>
                  <td className="border border-black p-1 font-bold">Common IP Addresses</td>
                  <td colSpan={2} className="border border-black p-1 text-justify text-xs">
                    Bidder may please note that GeM is capturing and showing the IP addresses used by the Buyer and the Bidder(s)/Seller(s). The received bids having matching/common IP address with either Bidder(s)/Seller(s) or Buyer, shall be outrightly rejected & shall not be considered for further evaluation.
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold">19</td>
                  <td colSpan={3} className="border border-black p-1 font-bold text-center">REST ALL TENDER TERM & CONDITION AS PER OFBPM-2018</td>
                </tr>
              </tbody>
            </table>

            {/* TPC PROPOSAL */}
            <div className="font-bold mb-2">18. TPC PROPOSAL:-</div>
            <p className="mb-4 text-justify">
              It is proposed to issue an {isOTE ? 'OTE' : `${teTyp} (Two bid)`} for {isOTE ? '100%' : '80%'} of the SHIS quantity to the following firm(s) with the terms & condition as mentioned in Annexure-17 through GeM custom bid & T.O.D for instant {teTyp} case is proposed as 21 days.
            </p>
            <table className="w-[600px] border-collapse border border-black text-sm mb-4">
              <thead>
                <tr>
                  <th className="border border-black p-1 text-center w-12">Sl No</th>
                  <th className="border border-black p-1 text-center">Item</th>
                  <th className="border border-black p-1 text-center w-32">{teTyp} QTY</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                    <td className="border border-black p-1">{it.item_description} (LF {it.lf_no})</td>
                    <td className="border border-black p-1 text-center font-bold">{(it as any).lte_qty} Nos.</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!isOTE && (
              <>
                <div className="font-bold underline mb-2 mt-6">{teTyp} FIRMS:</div>
                <div className="mb-6">
                  {lteFirms.map((f: any, i: number) => (
                    <div key={i}>{f.party_nam || f.vendor_name}</div>
                  ))}
                </div>

                <p className="mb-4 text-justify">
                  Further, to issue SDOTE (2 bid) for 20% of the SHIS quantity to OEM/Manufacturers (with condition not to allow established firm or firms having pending supply order of tender item) with the terms & condition as mentioned in Annexure-17 through GeM custom bid & T.O.D for instant case is proposed to be 21 days.
                </p>
                <table className="w-[600px] border-collapse border border-black text-sm mb-8">
                  <thead>
                    <tr>
                      <th className="border border-black p-1 text-center w-12">Sl No</th>
                      <th className="border border-black p-1 text-center">Item</th>
                      <th className="border border-black p-1 text-center w-32">SDOTE QTY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="border border-black p-1 text-center">{idx + 1}</td>
                        <td className="border border-black p-1">{it.item_description} (LF {it.lf_no})</td>
                        <td className="border border-black p-1 text-center font-bold">{(it as any).sdote_qty} Nos.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="flex justify-end mt-12 mb-12">
              <div className="text-center">
                <div className="font-bold">({vsl?.prepared_by || 'USER_456'})</div>
                <div className="font-bold">MEMBER SECRETARY</div>
              </div>
            </div>

            {/* DELIBERATION */}
            <div className="font-bold mb-2">19. {tpcLevel} DELIBERATION :</div>
            <div className="mb-8">
              TPC deliberated on the brief and noted the requirements, established sources, and the proposed mode of tendering as detailed above.
            </div>

            {/* DECISION */}
            <div className="font-bold mb-2">20. TPC DECISION:-</div>
            <div className="mb-12">
              It is decided to issue the tender as proposed in para 18 with terms and conditions as mentioned in Annexure-17.
            </div>

            <div className="italic text-center text-xs mb-16">
              (Undertaking is hereby given that none of undersigned TPC Member has any personal interest in the companies/agencies participating in this tender.)
            </div>

            <div className="flex justify-between mt-12 text-sm font-bold pb-20">
              <div className="text-center w-1/4 pt-8">
                <div className="border-t border-black pt-1 mx-4">MEMBER USER</div>
              </div>
              <div className="text-center w-1/4 pt-8">
                <div className="border-t border-black pt-1 mx-4">MEMBER QC</div>
              </div>
              <div className="text-center w-1/4 pt-8">
                <div className="border-t border-black pt-1 mx-4">MEMBER FINANCE</div>
              </div>
              <div className="text-center w-1/4 pt-8">
                <div className="border-t border-black pt-1 mx-4">CHAIRMAN/TPC</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
