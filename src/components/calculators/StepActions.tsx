'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { nextBuiltStep, previousBuiltStep, type StepId } from '@/lib/calc-steps'

/**
 * Back and Next, pinned to the bottom of the viewport on every step of every
 * calculator.
 *
 * Pinned rather than placed at the end of the content because the point is
 * that it is in the SAME place — the old per-page "Next step" block sat in a
 * sidebar that landed 2534px down a 3694px phone page, which is a link most
 * people never saw. Height is fixed and published as --zon-action-bar-h so
 * anything else anchored to the bottom of the screen can clear it.
 */
export default function StepActions({
  current,
  /** Optional live readout for the desktop middle slot — the phone has no room. */
  summary,
}: {
  current: StepId
  summary?: React.ReactNode
}) {
  const back = previousBuiltStep(current)
  const next = nextBuiltStep(current)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--zon-action-bar-h', '4.5rem')
    return () => { root.style.removeProperty('--zon-action-bar-h') }
  }, [])

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zon-rule bg-zon-paper">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 md:gap-4">
        {back ? (
          <Link
            href={back.href!}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium text-zon-body ring-1 ring-zon-rule transition-colors hover:bg-zon-rule-soft md:px-4"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {back.short}
          </Link>
        ) : (
          <Link
            href="/calculators"
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium text-zon-body ring-1 ring-zon-rule transition-colors hover:bg-zon-rule-soft md:px-4"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            All
          </Link>
        )}

        {summary ? (
          <div className="hidden min-w-0 flex-1 md:block">{summary}</div>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        {next ? (
          <Link
            href={next.href!}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-zon-gold px-4 text-[15px] font-semibold text-zon-ink transition-colors hover:bg-zon-gold-deep md:flex-none md:px-6"
          >
            Next: {next.short}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <Link
            href="/calculators"
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-zon-body ring-1 ring-zon-rule transition-colors hover:bg-zon-rule-soft md:flex-none md:px-6"
          >
            All calculators
          </Link>
        )}
      </div>
    </div>
  )
}
