import { CalendarCheck, AlertTriangle } from 'lucide-react'
import { claimFreshness, mustCaveat } from '@/lib/content-freshness'
import { claimsFor } from '@/lib/guide-claims'
import type { Claim } from '@/lib/content-freshness'

/**
 * Says when a human last confirmed a claim, and stops asserting it when
 * nobody has in too long.
 *
 * WHY THE READER SEES THIS AT ALL, rather than it being a maintenance detail.
 * /calculators/battery already dates every scraped price, on the argument that
 * a price is a claim about a shop on a particular day. A sentence about which
 * NEC edition deleted 690.47(B) is the same kind of claim and was published
 * with no date at all, so a visitor had no way to judge how much of the page
 * was current — and neither did the next maintainer.
 *
 * WHAT IT DOES NOT CLAIM. "Checked on" is the date somebody read the source,
 * not a guarantee the source has not moved since. That is a smaller promise
 * than most freshness badges make, and it is the one this repo can keep: the
 * alternative is a green tick that means nothing, which is worse than no tick.
 *
 * Deliberately quiet while a claim is current — a date and nothing else. The
 * amber treatment is reserved for mustCaveat(), so it keeps its meaning. This
 * follows the design-token rule on state colour: amber means attention, and
 * spending it on a page that is merely a few months old would spend it
 * everywhere and mean nothing.
 */
function formatIso(iso: string): string {
  // Day before month, matching formatAsOf in battery-price.ts, and built by
  // hand for the same reason: this renders in the visitor's browser and month
  // names vary with the ICU build, so a locale call lets the test and the page
  // disagree.
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function ClaimStamp({ claim }: { claim: Claim }) {
  const f = claimFreshness(claim)

  if (!mustCaveat(f)) {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-xs text-zon-muted">
        <CalendarCheck className="mt-0.5 w-3.5 h-3.5 shrink-0" />
        <span>
          Checked {formatIso(claim.checkedOn)} against {claim.source}
          {claim.sourceUrl && (
            <>
              {' — '}
              <a href={claim.sourceUrl} className="text-zon-gold-deep hover:underline" target="_blank" rel="noreferrer">
                source
              </a>
            </>
          )}
          .
        </span>
      </p>
    )
  }

  // Past the second threshold, or the source announced a change date that has
  // passed. The page stops stating this plainly and says why, rather than
  // hiding the claim: a reader who came for it is better served by the claim
  // plus an honest warning than by a gap where it used to be. Same call
  // battery-price.ts makes for a stale price.
  const reason =
    f.kind === 'superseded'
      ? `This was last confirmed on ${formatIso(claim.checkedOn)}, before ${formatIso(claim.changesOn!)} — a date the source itself gave for this changing. Treat it as out of date until we have re-read it.`
      : f.kind === 'unknown'
        ? 'We cannot tell when this was last confirmed, so treat it as unverified.'
        : `Nobody here has confirmed this since ${formatIso(claim.checkedOn)}. It may still be right; we have not checked recently enough to say so.`

  return (
    <p className="mt-2 flex items-start gap-1.5 rounded-md border border-zon-amber-tint bg-zon-amber-tint px-2.5 py-2 text-xs text-zon-body">
      <AlertTriangle className="mt-0.5 w-3.5 h-3.5 shrink-0 text-zon-amber" />
      <span>
        <strong>Not recently verified.</strong> {reason} Check {claim.source} yourself before
        relying on it.
      </span>
    </p>
  )
}

/**
 * Every registered claim for one guide, as a block.
 *
 * Renders nothing for a guide with no registered claims, which is the honest
 * state for a page that only explains physics — not an omission to fix by
 * inventing a claim so the component has something to show.
 */
export function GuideClaims({ slug }: { slug: string }) {
  const claims = claimsFor(slug)
  if (claims.length === 0) return null

  return (
    <section id="claims" className="mt-10 scroll-mt-24 border-t border-zon-rule pt-5">
      <h2 className="mb-1 text-sm font-semibold text-zon-ink">What this page asserts, and when we last checked</h2>
      <p className="mb-3 text-xs text-zon-muted">
        The reasoning on this page is ours. These specific claims come from somewhere else and
        can change without us noticing — so here is where each came from and when a person last
        read it.
      </p>
      <ul className="space-y-3">
        {claims.map(claim => (
          <li key={claim.id}>
            <p className="text-sm text-zon-body">{claim.statement}</p>
            <ClaimStamp claim={claim} />
          </li>
        ))}
      </ul>
    </section>
  )
}
