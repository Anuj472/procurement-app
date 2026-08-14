import { createClient } from '../lib/supabase/server'
import SearchBar from '../components/SearchBar'
import Link from 'next/link'

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolvedParams = await searchParams
  const query = resolvedParams.q || ''
  const supabase = await createClient()

  let items: any[] = [], shis: any[] = [], parties: any[] = [], pos: any[] = []

  if (query) {
    const searchPattern = `%${query}%`
    const [itemsRes, shisRes, partiesRes, posRes] = await Promise.all([
      supabase.from('m_item').select('lf_no, item_description').or(`lf_no.ilike.${searchPattern},item_description.ilike.${searchPattern}`).limit(5),
      supabase.from('shis_table').select('shis_no, shis_dt').ilike('shis_no', searchPattern).limit(5),
      supabase.from('m_party').select('party_cd, party_nam').or(`party_cd.ilike.${searchPattern},party_nam.ilike.${searchPattern}`).limit(5),
      supabase.from('po_order').select('po_no, po_dt, status').ilike('po_no', searchPattern).limit(5)
    ])
    items = itemsRes.data || []; shis = shisRes.data || []; parties = partiesRes.data || []; pos = posRes.data || []
  }

  return (
    <main className="min-h-screen bg-transparent relative z-0">
      <div className="fixed w-full h-full top-0 left-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white to-purple-50/30" />
        <div className="absolute w-[500px] h-[500px] top-[10%] left-[5%] rounded-full bg-blue-400 opacity-5 blur-3xl animate-pulse" />
        <div className="absolute w-[400px] h-[400px] top-[50%] right-[5%] rounded-full bg-purple-400 opacity-5 blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-5 py-16">
          <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-4 text-gray-900">Procurement Module</h1>
              <p className="text-lg text-gray-600">Search across items, SHIS records, parties, and purchase orders.</p>
            </div>
            <div className="flex gap-4">
              <Link href="/procurement/clubbed" className="px-5 py-3 bg-white/80 backdrop-blur border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:shadow-sm transition">
                View Clubbed Vendors
              </Link>
              <Link href="/procurement/tender" className="px-5 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-sm transition">
                Create Tender →
              </Link>
            </div>
          </div>
          <SearchBar />

          {query && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <h2 className="text-2xl font-semibold mb-6 border-b border-gray-100 pb-4 text-gray-800">Items (LF No)</h2>
                {items.length === 0 ? <p className="text-gray-500">No items found.</p> : (
                  <ul className="space-y-4">
                    {items.map((item: any) => (
                      <li key={item.lf_no} className="p-4 rounded-xl bg-gray-50/50 hover:bg-blue-50/50 transition border border-transparent hover:border-blue-100">
                        <div className="font-bold text-blue-600 text-lg mb-1">{item.lf_no}</div>
                        <div className="text-gray-600 line-clamp-2">{item.item_description}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
