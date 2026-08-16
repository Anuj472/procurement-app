
'use client'
import { useState, useEffect } from 'react'
import { VSL, TEC, TPC, ModalType, ActiveTab } from '../types/procurement'
import ClubbedItemsModal from './modals/ClubbedItemsModal'
import CreateVSLModal from './modals/CreateVSLModal'
import CreateTECModal from './modals/CreateTECModal'
import CreateTPCModal from './modals/CreateTPCModal'
import PrintVSLModal from './modals/PrintVSLModal'
import PrintTECModal from './modals/PrintTECModal'
import PrintTPCModal from './modals/PrintTPCModal'
import SHISRevalidationModal from './modals/SHISRevalidationModal'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: 'bg-amber-50 text-amber-700 border-amber-200',
    Issued: 'bg-blue-50 text-blue-700 border-blue-200',
    Closed: 'bg-slate-100 text-slate-600 border-slate-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    'PO Issued': 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  )
}

interface ActionTileProps {
  label: string
  sublabel?: string
  icon: string
  iconBg: string
  iconColor: string
  disabled?: boolean
  badge?: string | number
  onClick: () => void
}

function ActionTile({ label, sublabel, icon, iconBg, iconColor, disabled, badge, onClick }: ActionTileProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`group relative w-full h-[154px] rounded-2xl p-4 flex flex-col items-center justify-between text-center transition-all duration-200 border ${disabled
        ? 'bg-slate-50/60 border-slate-200/70 opacity-40 cursor-not-allowed'
        : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:translate-y-0 shadow-xs'
        }`}
    >
      {badge !== undefined && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {badge}
        </span>
      )}

      <div className={`w-12 h-12 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center text-xl transition-transform duration-200 group-hover:scale-110 shadow-2xs`}>
        <i className={`bi ${icon}`}></i>
      </div>

      <div className="w-full">
        <h3 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">
          {label}
        </h3>
        {sublabel && (
          <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-tight truncate max-w-full">
            {sublabel}
          </p>
        )}
      </div>

      <div className={`w-6 h-0.5 rounded-full transition-all duration-200 ${disabled ? 'bg-transparent' : 'bg-transparent group-hover:bg-blue-600 group-hover:w-12'}`} />
    </button>
  )
}

export default function ProcurementDashboard() {
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('vsl')
  const [searchQuery, setSearchQuery] = useState('')
  const [vsls, setVsls] = useState<VSL[]>([])
  const [tecs, setTecs] = useState<TEC[]>([])
  const [tpcs, setTpcs] = useState<TPC[]>([])

  useEffect(() => {
    fetch('/api/procurement/get-vsls')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.vsls) {
          setVsls(data.vsls)
        }
      })
      .catch(err => console.error('Error fetching VSLs:', err))

    fetch('/api/procurement/get-tecs')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.tecs) {
          setTecs(data.tecs)
        }
      })
      .catch(err => console.error('Error fetching TECs:', err))
  }, [])

  const closeModal = () => setActiveModal(null)

  const handleAutoConvertTE = async (pre_te_no: string) => {
    try {
      const now = new Date();
      let fyYear = now.getFullYear() % 100;
      if (now.getMonth() < 3) fyYear -= 1;
      
      const random8 = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      const teNo10Digit = `${fyYear}${random8}`;
      const finalTe = teNo10Digit;

      const res = await fetch('/api/procurement/update-te', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_te_no, te_no: finalTe })
      });
      const data = await res.json();
      
      if (!data.success) throw new Error(data.error || 'Failed to update TE number');
      
      setVsls(prev => prev.map(v => (v.vsl_no === pre_te_no || v.pre_te_no === pre_te_no) ? { ...v, te_no: finalTe } : v));
    } catch (err: any) {
      alert('Error converting to TE: ' + err.message);
    }
  }

  const handleDeleteVSL = async (pre_te_no: string) => {
    if (!confirm('Are you sure you want to permanently delete VSL ' + pre_te_no + '?')) return
    try {
      const res = await fetch('/api/procurement/delete-vsl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_te_no })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setVsls(prev => prev.filter(v => v.pre_te_no !== pre_te_no && v.vsl_no !== pre_te_no))
    } catch (err: any) {
      alert('Error deleting VSL: ' + err.message)
    }
  }

  const filteredVSLs = vsls.filter(v => {
    const q = searchQuery.toLowerCase()
    return (v.vsl_no ?? v.pre_te_no ?? '').toLowerCase().includes(q) ||
      ((v.prepared_by ?? v.user_id ?? '').toLowerCase().includes(q))
  })
  const filteredTECs = tecs.filter(t =>
    t.tec_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.te_no.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredTPCs = tpcs.filter(p =>
    p.tpc_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tec_no.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800">
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">NETRA ERP</span>
                <span className="text-slate-300">â€¢</span>
                <span className="text-[11px] text-slate-500 font-medium">India Optel Limited</span>
              </div>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                Procurement & Tender Automation
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
              <i className="bi bi-bell text-xl"></i>
              <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
              JD
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Items</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">24</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center text-lg">
              <i className="bi bi-box-seam"></i>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor Shortlists</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{vsls.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              <i className="bi bi-card-list"></i>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Technical Evals</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{tecs.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
              <i className="bi bi-clipboard-check"></i>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purchases (TPC)</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{tpcs.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
              <i className="bi bi-cash-coin"></i>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Procurement Actions
              </h2>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              7 Actions
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3.5">
            <ActionTile
              label="SHIS Reval."
              icon="bi-shield-check"
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              onClick={() => setActiveModal('shis-revalidation')}
            />
            <ActionTile
              label="Clubbed Items"
              icon="bi-boxes"
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              onClick={() => setActiveModal('clubbed')}
            />
            <ActionTile
              label="VSL"
              icon="bi-card-checklist"
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              onClick={() => setActiveModal('create-vsl')}
            />
            <ActionTile
              label="Print VSL"
              icon="bi-printer"
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
              disabled={vsls.length === 0}
              badge={vsls.length > 0 ? vsls.length : undefined}
              onClick={() => vsls.length > 0 && setActiveModal('print-vsl')}
            />
            <ActionTile
              label="TEC"
              icon="bi-clipboard2-check"
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              onClick={() => setActiveModal('create-tec')}
            />
            <ActionTile
              label="Print TEC"
              icon="bi-printer"
              iconBg="bg-teal-50"
              iconColor="text-teal-600"
              disabled={tecs.length === 0}
              badge={tecs.length > 0 ? tecs.length : undefined}
              onClick={() => tecs.length > 0 && setActiveModal('print-tec')}
            />
            <ActionTile
              label="TPC"
              icon="bi-cash-coin"
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              onClick={() => setActiveModal('create-tpc')}
            />
            <ActionTile
              label="Print TPC"
              icon="bi-printer"
              iconBg="bg-orange-50"
              iconColor="text-orange-600"
              disabled={tpcs.length === 0}
              badge={tpcs.length > 0 ? tpcs.length : undefined}
              onClick={() => tpcs.length > 0 && setActiveModal('print-tpc')}
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200 overflow-x-auto custom-scrollbar">
              {([ 
                { key: 'vsl', label: 'VSL', count: vsls.length },
                { key: 'tec', label: 'TEC', count: tecs.length },
                { key: 'tpc', label: 'TPC', count: tpcs.length },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key) }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.key
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative">
              <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            {activeTab === 'vsl' && (
              filteredVSLs.length === 0 ? (
                <EmptyState
                  icon="bi-card-checklist"
                  label="No VSL records found"
                  sub={vsls.length === 0 ? 'Click "Create VSL" above to shortlist vendors for an item' : 'No records match your search query'}
                />
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">VSL Number</th>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">TE No</th>
                      <th className="px-6 py-3.5 text-center">Vendors</th>
                      <th className="px-6 py-3.5 text-center">Items</th>
                      <th className="px-6 py-3.5">Prepared By</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredVSLs.map((vsl) => (
                      <tr key={vsl.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-blue-600">{vsl.vsl_no}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{vsl.vsl_dt}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{vsl.te_no || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold text-xs border border-blue-100">
                            {vsl.vendors.length}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-xs">
                            {vsl.items.length}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">{vsl.prepared_by || '-'}</td>
                        <td className="px-6 py-4"><StatusBadge status={vsl.status} /></td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!vsl.te_no && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleAutoConvertTE(vsl.pre_te_no || vsl.vsl_no) }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-semibold text-xs transition-colors"
                              >
                                <i className="bi bi-link-45deg"></i> TE
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setActiveModal('print-vsl') }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-semibold text-xs transition-colors"
                            >
                              <i className="bi bi-printer"></i> Print
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteVSL(vsl.pre_te_no || vsl.vsl_no) }}
                              className="inline-flex items-center gap-1.5 p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 transition-colors"
                              title="Delete VSL"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {activeTab === 'tec' && (
              filteredTECs.length === 0 ? (
                <EmptyState
                  icon="bi-clipboard2-check"
                  label="No TEC records found"
                  sub={tecs.length === 0 ? 'Click "Create TEC" above to evaluate shortlisted vendors' : 'No records match your search query'}
                />
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">TEC Number</th>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">VSL Reference</th>
                      <th className="px-6 py-3.5 text-center">Evaluations</th>
                      <th className="px-6 py-3.5">Prepared By</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredTECs.map((tec) => (
                      <tr key={tec.tec_no} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-blue-600">{tec.tec_no}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{tec.tec_dt}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{tec.te_no}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold text-xs border border-emerald-100">
                            {tec.evaluations.length}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">{tec.prepared_by || '-'}</td>
                        <td className="px-6 py-4"><StatusBadge status={tec.status} /></td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveModal('print-tec') }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-semibold text-xs transition-colors"
                          >
                            <i className="bi bi-printer"></i> Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {activeTab === 'tpc' && (
              filteredTPCs.length === 0 ? (
                <EmptyState
                  icon="bi-cash-coin"
                  label="No TPC records found"
                  sub={tpcs.length === 0 ? 'Click "Create TPC" above to record committee decisions' : 'No records match your search query'}
                />
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">TPC Number</th>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">TEC Reference</th>
                      <th className="px-6 py-3.5">Selected L1 Vendor</th>
                      <th className="px-6 py-3.5 text-right">Approved Rate (â‚¹)</th>
                      <th className="px-6 py-3.5">Prepared By</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredTPCs.map((tpc) => (
                      <tr key={tpc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-blue-600">{tpc.tpc_no}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{tpc.tpc_dt}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{tpc.tec_no}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{tpc.final_vendor_name || '-'}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">
                          {tpc.approved_rate != null ? `â‚¹${Number(tpc.approved_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">{tpc.prepared_by || '-'}</td>
                        <td className="px-6 py-4"><StatusBadge status={tpc.status} /></td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveModal('print-tpc') }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-semibold text-xs transition-colors"
                          >
                            <i className="bi bi-printer"></i> Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </section>
      </main>

      {/* Modals */}
      {activeModal === 'shis-revalidation' && <SHISRevalidationModal onClose={closeModal} />}
      {activeModal === 'clubbed' && <ClubbedItemsModal onClose={closeModal} />}
      {activeModal === 'create-vsl' && (
        <CreateVSLModal
          onClose={closeModal}
          existingCount={vsls.length}
          onSave={vsl => {
            const normalized = {
              ...vsl,
              id: vsl.id || `vsl-${Date.now()}`,
              vsl_no: vsl.pre_te_no || vsl.vsl_no || 'VSL',
              prepared_by: vsl.user_id || vsl.prepared_by || '',
              status: 'Draft',
              created_at: new Date().toISOString(),
            }
            setVsls(prev => [normalized, ...prev]); setActiveTab('vsl'); closeModal()
          }}
        />
      )}
      {activeModal === 'create-tec' && (
        <CreateTECModal
          onClose={closeModal}
          vsls={vsls}
          existingCount={tecs.length}
          onSave={tec => { setTecs(prev => [tec, ...prev]); setActiveTab('tec'); closeModal() }}
        />
      )}
      {activeModal === 'create-tpc' && (
        <CreateTPCModal
          onClose={closeModal}
          tecs={tecs}
          existingCount={tpcs.length}
          onSave={tpc => { setTpcs(prev => [tpc, ...prev]); setActiveTab('tpc'); closeModal() }}
        />
      )}
      {activeModal === 'print-vsl' && <PrintVSLModal onClose={closeModal} vsls={vsls} />}
      {activeModal === 'print-tec' && <PrintTECModal onClose={closeModal} tecs={tecs} vsls={vsls} />}
      {activeModal === 'print-tpc' && <PrintTPCModal onClose={closeModal} tpcs={tpcs} />}
    </div>
  )
}

function EmptyState({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl text-slate-400 mb-3 border border-slate-200">
        <i className={`bi ${icon}`}></i>
      </div>
      <p className="text-slate-800 font-bold text-sm">{label}</p>
      <p className="text-slate-500 text-xs mt-1 max-w-sm">{sub}</p>
    </div>
  )
}







