'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, UserPlus } from 'lucide-react'

const links = [
  { href: '/nurse',        label: 'Patients', Icon: Users },
  { href: '/nurse/enroll', label: 'Enroll',   Icon: UserPlus },
]

export default function NurseBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 z-10 bg-surface-elevated border-t-2 border-surface-border flex items-center justify-center gap-3 px-5 pt-[18px] pb-4 h-[89px]">
      {links.map(({ href, label, Icon }) => {
        const active = pathname === href || (href !== '/nurse' && pathname.startsWith(href))
        const patientsActive = href === '/nurse' && (pathname === '/nurse' || pathname.startsWith('/nurse/patients'))
        const isActive = patientsActive || (href !== '/nurse' && active)

        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center px-6 py-2 rounded-[32px] w-[120px] transition-colors ${
              isActive ? 'bg-brand-700' : ''
            }`}
          >
            <Icon
              size={20}
              className={isActive ? 'text-brand-100' : 'text-surface-secondary'}
              strokeWidth={1.8}
            />
            <span
              className={`text-base font-semibold tracking-nav mt-0.5 ${
                isActive ? 'text-brand-100' : 'text-surface-secondary'
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
