import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { full } from '@/lib/version'
import SignOutButton from '@/components/admin/SignOutButton'

const NAV = [
  { href: '/admin/roadmap', label: 'Roadmap', enabled: true },
  { href: '/admin/batteries', label: 'Battery Review', enabled: true },
  { href: '#', label: 'SEO', enabled: false },
  { href: '#', label: 'Memberships', enabled: false },
  { href: '#', label: 'Payments', enabled: false },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin()

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex">
      <aside className="w-56 shrink-0 bg-gray-900 text-gray-300 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800">
          <p className="text-white font-semibold text-sm">ZonZelf Admin</p>
          <p className="text-xs text-gray-500 mt-0.5">v{full()}</p>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((item) =>
            item.enabled ? (
              <Link
                key={item.label}
                href={item.href}
                className="block px-4 py-2 text-sm hover:bg-gray-800 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <div
                key={item.label}
                className="flex items-center justify-between px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
              >
                {item.label}
                <span className="text-[10px] uppercase tracking-wide bg-gray-800 text-gray-500 rounded px-1.5 py-0.5">
                  Soon
                </span>
              </div>
            )
          )}
        </nav>
        <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500 truncate">{user.email}</span>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 px-6 py-8 max-w-4xl">{children}</main>
    </div>
  )
}
