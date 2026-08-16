"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function TenderClubbing() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/procurement/tender-items')
      .then(res => res.json())
      .then(json => {
        setData(json.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggleSelection = (lf_no: string) => {
    const newSet = new Set(selectedItems)
    if (newSet.has(lf_no)) newSet.delete(lf_no)
    else newSet.add(lf_no)
    setSelectedItems(newSet)
  }

  const toggleAll = () => {
    if (selectedItems.size === data.length) setSelectedItems(new Set())
    else setSelectedItems(new Set(data.map(d => d.lf_no)))
  }

  return (
    <main className="min-h-screen bg-transparent relative z-0 pb-20">
      <div className="fixed inset-0 -z-10 bg-slate-50"></div>

      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-5">
          <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-gray-900">Tender Clubbing Matrix</h1>
              <p className="text-lg text-gray-600">Review requirements, qualified vendors, and last purchase rates for tender preparation.</p>
            </div>
            <div className="flex gap-4">
              <Link href="/" className="px-5 py-2.5 bg-white/80 backdrop-blur border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:shadow-sm transition">
                ← Back
              </Link>
              <button
                disabled={selectedItems.size === 0}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                onClick={() => alert(`Creating combined tender document with ${selectedItems.size} items!`)}
              >
                Create Tender ({selectedItems.size})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="py-4 px-6 w-12">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedItems.size === data.length && data.length > 0}
                          onChange={toggleAll}
                        />
                      </th>
                      <th className="py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">LF No & Description</th>
                      <th className="py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">Vendor Names</th>
                      <th className="py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">All SHIS</th>
                      <th className="py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider text-right">Total Req Qty</th>
                      <th className="py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider text-right">Last Rate (Wo Tax)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map((item: any) => {
                      const isSelected = selectedItems.has(item.lf_no);
                      return (
                        <tr
                          key={item.lf_no}
                          onClick={() => toggleSelection(item.lf_no)}
                          className={`cursor-pointer transition-colors hover:bg-blue-50/30 ${isSelected ? 'bg-blue-50/50' : ''}`}
                        >
                          <td className="py-4 px-6">
                            <input
                              type="checkbox"
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                              checked={isSelected}
                              readOnly
                            />
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-blue-600">{item.lf_no}</div>
                            <div className="text-sm text-gray-600 line-clamp-1">{item.item_description}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              {item.vendors.map((v: string, vIdx: number) => (
                                <span key={vIdx} className="text-xs font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded w-fit">
                                  {v}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-wrap gap-1">
                              {item.shis_list.map((shis: string, sIdx: number) => (
                                <span key={sIdx} className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-xs font-semibold text-blue-700">
                                  {shis}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-gray-900">{item.total_required_qty}</td>
                          <td className="py-4 px-6 text-right font-semibold text-gray-900">
                            {item.last_purchased_rate !== 'N/A' ? `₹${Number(item.last_purchased_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {data.length === 0 && (
                  <div className="p-12 text-center text-gray-500 text-lg">No items with pending SHIS requirements found.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
