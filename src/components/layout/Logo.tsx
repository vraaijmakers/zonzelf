import Link from 'next/link'
import { cn } from '@/lib/utils'

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="5.5" />
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 1.7v2.6" />
        <path d="M12 19.7v2.6" />
        <path d="M22.3 12h-2.6" />
        <path d="M4.3 12H1.7" />
        <path d="M19.3 4.7l-1.85 1.85" />
        <path d="M6.55 17.45L4.7 19.3" />
        <path d="M19.3 19.3l-1.85-1.85" />
        <path d="M6.55 6.55L4.7 4.7" />
      </g>
    </svg>
  )
}

export default function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2 font-bold text-xl text-zon-gold-deep', className)}>
      <Mark className={cn('w-6 h-6', markClassName)} />
      ZonZelf
    </Link>
  )
}
