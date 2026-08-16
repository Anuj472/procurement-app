'use client'
import { useState } from 'react'

interface Props {
  onClose: () => void
  onSave: (teNo: string) => void
  vslNo: string
}

export default function ConvertTEModal({ onClose, onSave, vslNo }: Props) {
  const [teInput, setTeInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const trimmed = teInput.trim()
    if (!trimmed) {
      setError('Please enter a TE number.')
      return
    }
    
    // We expect a 10 digit number.
    if (!/^d{10}$/.test(trimmed)) {
      setError('TE number must be exactly 10 digits.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const finalTe = `${trimmed} FY`
      const res = await fetch('/api/procurement/update-te', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_te_no: vslNo, te_no: finalTe })
      })
      const data = await res.json()
      
      if (!data.success) throw new Error(data.error || 'Failed to update TE number')
      
      onSave(finalTe)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Convert to TE</h2>
          <button onClick={onClose} className="text-white hover:text-blue-200 text-xl">&times;</button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Assigning TE Number for VSL: <span className="font-bold text-slate-900">{vslNo}</span>
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-200">
              {error}
            </div>
          )}

          <label className="block text-sm font-bold text-slate-700 mb-2">Enter 10-digit TE Number</label>
          <div className="flex items-center gap-2">
            <input 
              type="text"
              maxLength={10}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-lg text-slate-900"
              placeholder="e.g. 2506010726"
              value={teInput}
              onChange={e => setTeInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <span className="text-slate-500 font-bold font-mono text-lg bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200">
              FY
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">The system will automatically append " FY" to your number.</p>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={loading || teInput.length !== 10}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
