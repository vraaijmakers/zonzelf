import Link from 'next/link'
import { Info } from 'lucide-react'

/**
 * The disclosure that must sit next to a paid link.
 *
 * The FTC's standard is "clear and conspicuous" — near the link, before the
 * click, in plain language. A footer link is not enough, which is why this is a
 * component that renders on the shelf rather than a line in /terms.
 *
 * Never render this unconditionally. It is driven by `anyPaid()` in
 * src/lib/affiliate.ts, so it appears exactly when something on the page can
 * actually earn a commission — see that file's header for why the two are wired
 * to the same boolean. Saying "some of these are affiliate links" above a shelf
 * where none of them are is its own small dishonesty, on a site whose entire
 * moat is beginner trust.
 */
export default function AffiliateDisclosure() {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-zon-blue-tint bg-zon-blue-tint px-4 py-3 text-sm text-zon-body">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-zon-blue" aria-hidden="true" />
      <span>
        Some links below are affiliate links — if you buy through one, the shop pays us a
        commission and you pay the same price either way. It never changes which batteries we
        show you, or the order they appear in.{' '}
        <Link href="/affiliate-disclosure" className="underline hover:no-underline">
          How we handle paid links
        </Link>
        .
      </span>
    </div>
  )
}
