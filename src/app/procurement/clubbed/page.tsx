"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ClubbedItemsPage() {
  const [tenderGroups, setTenderGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/procurement/club-items')
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.error)
        setTenderGroups(json.tender_groups || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 relative z-0 pb-20">
      {/* Background Ambience removed for cleaner UI */}
      <div className="fixed inset-0 -z-10 bg-slate-50"></div>

      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-5">
          {/* Header Bar */}
          <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider shadow-xs">
                  Tender Enquiry Matrix
                </span>
                <span className="text-sm text-slate-500 font-medium">
                  {tenderGroups.length} Vendor Pool Table{tenderGroups.length === 1 ? '' : 's'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                Clubbed Items by Common Supplying Vendors
              </h1>
              <p className="text-base text-slate-600 mt-1">
                Each table represents items that share the exact same historical supplier pool, grouped for combined tender issuance.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/procurement/tender"
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition"
              >
                Create Tender Matrix →
              </Link>
              <Link
                href="/"
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm font-medium hover:bg-slate-50 hover:shadow-xs transition"
              >
                ← Back
              </Link>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent"></div>
              <p className="text-slate-500 text-sm font-medium">Analyzing historical vendor pools & SHIS records...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 mb-8 shadow-xs">
              <h3 className="font-semibold text-base mb-1">Failed to load procurement groups</h3>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && tenderGroups.length === 0 && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs">
              <p className="text-slate-500 text-base">No clubbed item groups found.</p>
            </div>
          )}

          {/* Render One Separate Table per Distinct Vendor Pool */}
          <div className="space-y-10">
            {tenderGroups.map((group: any, gIdx: number) => (
              <div
                key={gIdx}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* Table / Group Header */}
                <div className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 font-bold text-sm">
                      #{gIdx + 1}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-white">
                        Table {gIdx + 1}: Common Supplying Vendor Pool
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs text-slate-300">
                        <span className="font-semibold text-blue-300">Qualified Vendors:</span>
                        {group.vendors.map((v: string, vIdx: number) => (
                          <span key={vIdx} className="bg-slate-800 px-2 py-0.5 rounded text-slate-200 border border-slate-700">
                            {vIdx + 1}. {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="self-start md:self-center">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-400/20">
                      {group.items.length} {group.items.length === 1 ? 'Item' : 'Items'} in this Group
                    </span>
                  </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                        <th className="py-3.5 px-6 w-1/4">Item / LF No</th>
                        <th className="py-3.5 px-6 w-1/3">Previous Vendors</th>
                        <th className="py-3.5 px-6 text-right w-1/5">Last Supplied Rate</th>
                        <th className="py-3.5 px-6 text-right w-1/5">Total SHIS Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {group.items.map((item: any, iIdx: number) => (
                        <tr
                          key={item.lf_no || iIdx}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Column 1: Item / LF No */}
                          <td className="py-4 px-6 align-top">
                            <div className="font-bold text-blue-700 text-base font-mono">
                              {item.lf_no}
                            </div>
                            <div className="text-xs text-slate-600 font-normal mt-0.5 line-clamp-2">
                              {item.item_description}
                            </div>
                          </td>

                          {/* Column 2: Previous Vendors */}
                          <td className="py-4 px-6 align-top">
                            <ul className="space-y-1">
                              {item.previous_vendors && item.previous_vendors.length > 0 ? (
                                item.previous_vendors.map((v: string, vIdx: number) => (
                                  <li
                                    key={vIdx}
                                    className="text-slate-800 text-xs font-medium flex items-start gap-1.5"
                                  >
                                    <span className="font-semibold text-slate-500 font-mono">
                                      {vIdx + 1}.
                                    </span>
                                    <span>{v}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-slate-400 text-xs italic">
                                  No prior vendors recorded
                                </li>
                              )}
                            </ul>
                          </td>

                          {/* Column 3: Last Supplied Rate */}
                          <td className="py-4 px-6 text-right align-top">
                            <div className="font-bold text-slate-900 font-mono text-base">
                              {item.last_supplied_rate != null
                                ? `₹${Number(item.last_supplied_rate).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}`
                                : 'N/A'}
                            </div>
                            <span className="text-[11px] text-slate-600 uppercase font-semibold">
                              (Without Tax)
                            </span>
                          </td>

                          {/* Column 4: Total SHIS Quantity */}
                          <td className="py-4 px-6 text-right align-top">
                            <span className="inline-block px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold font-mono text-base border border-emerald-200">
                              {Number(item.total_shis_quantity || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
