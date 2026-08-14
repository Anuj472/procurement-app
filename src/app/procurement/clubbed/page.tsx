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
    <main className="min-h-screen bg-transparent relative z-0 pb-20">
      <div className="fixed w-full h-full top-0 left-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white to-purple-50/30" />
        <div className="absolute w-[500px] h-[500px] top-[10%] left-[5%] rounded-full bg-blue-400 opacity-5 blur-3xl animate-pulse" />
        <div className="absolute w-[400px] h-[400px] top-[50%] right-[5%] rounded-full bg-purple-400 opacity-5 blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-5">
          <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-gray-900">Tender Clubbing by Vendor Pools</h1>
              <p className="text-lg text-gray-600">Items grouped into separate tables based on identical supplying vendor pools.</p>
            </div>
            <Link href="/" className="px-5 py-2.5 bg-white/80 backdrop-blur border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:shadow-sm transition">
              ← Back to Search
            </Link>
          </div>

          {loading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100">Error: {error}</div>}

          {!loading && !error && tenderGroups.length === 0 && (
            <div className="bg-white/80 backdrop-blur-md p-12 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
              No clubbed groups found.
            </div>
          )}

          <div className="space-y-12">
            {tenderGroups.map((group: any, gIdx: number) => (
              <div key={gIdx} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Group Header: Shared Vendors */}
                <div className="bg-gradient-to-r from-blue-50/80 to-transparent p-6 border-b border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wider">
                        Tender Group #{gIdx + 1}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900 mt-2">Shared Supplying Vendors:</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {group.vendors.map((v: string, vIdx: number) => (
                          <span key={vIdx} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 shadow-2xs">
                            {vIdx + 1}. {v}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-500 self-start md:self-center bg-white/60 px-3 py-1.5 rounded-xl border border-gray-200">
                      {group.items.length} Items in Group
                    </span>
                  </div>
                </div>

                {/* Items Table for this exact vendor pool */}
                <div className="overflow-x-auto custom-scrollbar p-6">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-500 text-sm">
                        <th className="pb-3 font-semibold">Item / LF No</th>
                        <th className="pb-3 font-semibold">Description</th>
                        <th className="pb-3 font-semibold text-right">Last Supplied Rate (Wo Tax)</th>
                        <th className="pb-3 font-semibold text-right">Total SHIS Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {group.items.map((item: any, iIdx: number) => (
                        <tr key={item.lf_no || iIdx} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-4 font-bold text-blue-600 text-base">{item.lf_no}</td>
                          <td className="py-4 text-gray-700 text-sm">{item.item_description}</td>
                          <td className="py-4 text-right font-semibold text-gray-900">
                            {item.last_supplied_rate !== 'N/A' ? `₹${Number(item.last_supplied_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'}
                          </td>
                          <td className="py-4 text-right font-bold text-gray-900 text-base">
                            {item.total_shis_quantity}
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
