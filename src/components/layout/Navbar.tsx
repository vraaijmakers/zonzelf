'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/guides',      label: 'Guides' },
  { href: '/calculators', label: 'Calculators' },
  { href: '/resources',   label: 'Resources' },
  { href: '/dashboard',   label: 'My Dashboard' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-yellow-600">
          <Sun className="w-6 h-6" />
          ZonZelf
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/auth/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-yellow-500 hover:bg-yellow-600 text-white')}
          >
            Get started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-1 bg-white">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2 border-t mt-1">
            <Link
              href="/auth/login"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1 justify-center')}
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className={cn(buttonVariants({ size: 'sm' }), 'flex-1 justify-center bg-yellow-500 hover:bg-yellow-600 text-white')}
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
