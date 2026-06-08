import { Search, SlidersHorizontal, UserPlus } from 'lucide-react'
import Link from 'next/link'
import PatientCard from '@/components/nurse/PatientCard'
import NurseBottomNav from '@/components/nurse/BottomNav'
import Logo from '@/components/ui/Logo'
import { patients } from '@/lib/data'

const stats = {
  total: patients.length,
  high: patients.filter(p => p.risk === 'High').length,
  improving: patients.filter(p => p.trend === 'Improving').length,
}

export default function NurseDashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-bg border-b-2 border-surface-border flex items-center justify-between px-5 pt-5 pb-[22px]">
        <div className="flex items-center gap-3">
          <Logo className="size-[30px]" />
          <span className="text-[22px] font-bold text-brand-700 leading-none">Revaive</span>
        </div>
        <Link
          href="/nurse/enroll"
          className="flex items-center gap-2 bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-full"
        >
          <UserPlus size={16} strokeWidth={1.8} />
          New Patient
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6 scrollbar-hide">
        {/* Greeting */}
        <div>
          <h1 className="text-[32px] font-bold text-surface-primary leading-tight tracking-tight">
            Good morning, Dr. Chen
          </h1>
          <p className="text-base text-surface-secondary mt-1">Here&apos;s your patient overview.</p>
        </div>

        {/* Stats card */}
        <div className="bg-brand-700 rounded-2xl p-5 grid grid-cols-3 divide-x divide-brand-600">
          <div className="flex flex-col items-center gap-1 pr-4">
            <span className="text-[32px] font-bold text-white leading-none">{stats.total}</span>
            <span className="text-xs font-semibold text-brand-100/70 tracking-overline uppercase text-center">Total Patients</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-4">
            <span className="text-[32px] font-bold text-[#fddad5] leading-none">{stats.high}</span>
            <span className="text-xs font-semibold text-brand-100/70 tracking-overline uppercase text-center">High Risk</span>
          </div>
          <div className="flex flex-col items-center gap-1 pl-4">
            <span className="text-[32px] font-bold text-[#e8f5ec] leading-none">{stats.improving}</span>
            <span className="text-xs font-semibold text-brand-100/70 tracking-overline uppercase text-center">Improving</span>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white border border-surface-border rounded-xl px-4 h-[52px]">
            <Search size={18} className="text-surface-tertiary shrink-0" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Search patients…"
              className="flex-1 bg-transparent text-base text-surface-primary placeholder:text-surface-tertiary outline-none"
            />
          </div>
          <button className="size-[52px] flex items-center justify-center bg-white border border-surface-border rounded-xl shrink-0">
            <SlidersHorizontal size={18} className="text-surface-secondary" strokeWidth={1.8} />
          </button>
        </div>

        {/* Patient list */}
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-overline text-surface-tertiary uppercase">
              All Patients ({patients.length})
            </h2>
          </div>
          {patients.map(patient => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      </main>

      <NurseBottomNav />
    </div>
  )
}
