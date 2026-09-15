import Link from 'next/link'
import { Caravan } from 'lucide-react'
import { BOAT_RV_GUIDE_HREF, isCodeDerived } from '@/lib/mobile-scope'
import type { StepId } from '@/lib/calc-steps'

/**
 * "This step assumes a building." One line, on every calculator step.
 *
 * WHY IT IS NOT A SECOND WARNING BOX
 * ----------------------------------
 * CalculatorDisclaimer already sits directly above this, in a gold alert box
 * with a triangle in it. Two stacked alert boxes do not warn twice as hard —
 * they train the reader to scroll past the pair, which costs us the warning we
 * already had. So this is deliberately quieter than the thing above it: a rule,
 * a small icon, one sentence, and a link.
 *
 * WHERE IT DOES SHOUT
 * -------------------
 * On a step whose output is read straight out of a code table, the wording
 * changes and the colour goes red. That is the cable and protection step: a
 * conductor gauge from NEC Table 310.16 is not merely unhelpful on a boat, it
 * is the wrong table, and somebody carrying that number aboard is the specific
 * harm this whole feature exists to prevent. isCodeDerived() decides, so if a
 * second step ever starts reading a table directly it escalates on its own.
 */
export default function ScopeNotice({ step }: { step: StepId }) {
  const strong = isCodeDerived(step)

  return (
    <div
      className={
        strong
          ? 'mb-6 flex items-start gap-2 rounded-lg border border-zon-red/30 bg-zon-red-tint px-4 py-3 text-sm text-zon-body'
          : 'mb-6 flex items-start gap-2 rounded-lg border border-zon-rule bg-zon-cream px-4 py-2.5 text-sm text-zon-muted'
      }
    >
      <Caravan
        className={`mt-0.5 h-4 w-4 shrink-0 ${strong ? 'text-zon-red' : 'text-zon-muted'}`}
        aria-hidden="true"
      />
      <span>
        {strong ? (
          <>
            <strong className="text-zon-ink">
              Building for a boat, van or RV? Do not carry these gauges across.
            </strong>{' '}
            They are read from NEC tables for a fixed building on land. A boat answers to ABYC
            E-11, an RV to NFPA 1192 — different tables, different answers.{' '}
          </>
        ) : (
          <>These calculators assume a building that stays put — fixed roof, fixed tilt, an earth
            electrode in the ground. Building for a boat, van or RV?{' '}
          </>
        )}
        <Link
          href={BOAT_RV_GUIDE_HREF}
          className={strong ? 'font-medium underline hover:no-underline' : 'underline hover:no-underline'}
        >
          What transfers and what does not
        </Link>
        .
      </span>
    </div>
  )
}
