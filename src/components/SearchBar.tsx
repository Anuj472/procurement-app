"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition, Suspense } from 'react'

function SearchInput() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [term, setTerm] = useState(searchParams.get('q') || '')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(() => {
      if (term.trim()) {
        router.push(`/procurement?q=${encodeURIComponent(term)}`)
      } else {
        router.push(`/procurement`)
      }
    })
  }

  return (
    <form onSubmit={handleSearch} className="mb-8 max-w-2xl">
      <div className="relative">
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search Item (LF No), SHIS, Party, or PO..."
          className="w-full p-4 pr-24 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="text-white absolute right-2.5 bottom-2.5 bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 disabled:opacity-50"
        >
          {isPending ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  )
}

export default function SearchBar() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500 bg-gray-50 rounded-lg">Loading search...</div>}>
      <SearchInput />
    </Suspense>
  )
}
