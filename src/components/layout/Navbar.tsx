'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Shield, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import SignOutButton from '@/components/admin/SignOutButton'
import Logo from '@/components/layout/Logo'

const NAV_LINKS = [
  { href: '/guides',      label: 'Guides' },
  { href: '/calculators', label: 'Calculators' },
]

type NavbarUser = { email: string; isAdmin: boolean } | null

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<NavbarUser>(null)

  useEffect(() => {
    const supabase = createClient()

    // The Admin link is a convenience only — requireAdmin() and RLS still
    // guard every /admin route. Reads the caller's own profiles row, which
    // the "profiles: read own row" policy allows.
    async function load(authUser: { id: string; email?: string } | null) {
      if (!authUser) return setUser(null)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single()
      setUser({ email: authUser.email ?? '', isAdmin: profile?.role === 'admin' })
    }

    supabase.auth.getUser().then(({ data }) => load(data.user))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user ?? null)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  return (
    <header className="border-b bg-zon-paper sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-zon-gold-tint text-zon-gold-deep'
                  : 'text-zon-body hover:bg-zon-rule-soft'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                    pathname.startsWith('/admin')
                      ? 'bg-zon-ink text-zon-paper border-zon-ink'
                      : 'text-zon-body border-zon-rule hover:bg-zon-rule-soft'
                  )}
                >
                  <Shield className="w-3.5 h-3.5" aria-hidden />
                  Admin
                </Link>
              )}
              <span className="text-sm text-zon-body max-w-[12rem] truncate">{user.email}</span>
              <SignOutButton className="text-sm text-zon-body hover:text-zon-ink transition-colors" />
            </>
          ) : (
            <Link href="/auth/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-1 bg-zon-paper">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-medium text-zon-body hover:bg-zon-rule-soft"
            >
              {label}
            </Link>
          ))}
          {user?.isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-medium text-zon-body hover:bg-zon-rule-soft inline-flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" aria-hidden />
              Admin
            </Link>
          )}
          {user ? (
            <div className="flex items-center justify-between pt-2 border-t mt-1">
              <span className="text-sm text-zon-body truncate">{user.email}</span>
              <SignOutButton className="text-sm text-zon-body hover:text-zon-ink transition-colors" />
            </div>
          ) : (
            <div className="flex pt-2 border-t mt-1">
              <Link
                href="/auth/login"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1 justify-center')}
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
