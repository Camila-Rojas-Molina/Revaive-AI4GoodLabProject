'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, TrendingUp } from 'lucide-react'

const links = [
  { href: '/patient',          label: 'Home',     Icon: Home },
  { href: '/patient/progress', label: 'Progress', Icon: TrendingUp },
]

export default function PatientBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 z-10 bg-white border-t-2 border-surface-border flex items-center justify-center gap-3 px-5 pt-[18px] pb-4 h-[90px]">
      {links.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center px-6 py-2 rounded-[32px] w-[120px] transition-colors ${
              active ? 'bg-brand-700' : ''
            }`}
          >
            <Icon
              size={20}
              className={active ? 'text-brand-100' : 'text-surface-secondary'}
              strokeWidth={1.8}
            />
            <span
              className={`text-base font-semibold tracking-nav mt-0.5 ${
                active ? 'text-brand-100' : 'text-surface-secondary'
              }`}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
