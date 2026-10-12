import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { RegisterBadge } from '@/components/ProtectionOutput'
import AcceptTermsForm from '@/components/auth/AcceptTermsForm'
import { CALC_STEPS, TOTAL_STEPS, needsAccount, stepById, type StepId } from '@/lib/calc-steps'
import { cn } from '@/lib/utils'
import type { TermsAccess } from '@/lib/terms'

/**
 * What a reader sees in place of a protection output they may not see yet.
 *
 * Two readers land here: one with no account, who is offered one, and one who
 * is signed in but has not agreed to the current terms (an older account, or
 * the terms changed), who is asked to. Both are told why in plain English —
 * the reason is the product's own capacity / protection split, not a paywall.
 *
 * `page` replaces a whole protection step; `card` stands in for one protection
 * output on a page that is otherwise open.
 */
export default function TermsGate({
  access,
  next,
  step,
  title,
  variant = 'page',
}: {
  access: Exclude<TermsAccess, 'granted'>
  /** Where to send the reader once they have an account and have agreed. */
  next: string
  /** The gated step — `page` variant. */
  step?: StepId
  /** The gated output's own title — `card` variant. */
  title?: string
  variant?: 'page' | 'card'
}) {
  const query = `?next=${encodeURIComponent(next)}`

  const action =
    access === 'anonymous' ? (
      <div className="space-y-3">
        <Link
          href={`/auth/signup${query}`}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'w-full bg-zon-gold text-zon-ink hover:bg-zon-gold-deep',
          )}
        >
          Create a free account
        </Link>
        <p className="text-xs text-zon-muted">
          Already have one?{' '}
          <Link href={`/auth/login${query}`} className="underline hover:no-underline">
            Sign in
          </Link>
          .
        </p>
      </div>
    ) : (
      <AcceptTermsForm next={next} />
    )

  if (variant === 'card') {
    return (
      <Card className="border-zon-rule">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base text-zon-ink">{title}</CardTitle>
            <RegisterBadge register="protection" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zon-muted" aria-hidden="true" />
            <p className="text-zon-body">
              {access === 'anonymous'
                ? 'This is a protection number: get it wrong and equipment is damaged. We show those to account holders who have agreed to the terms. Everything else on this page works without one.'
                : 'This is a protection number: get it wrong and equipment is damaged. Agree to the current terms to see it.'}
            </p>
          </div>
          {action}
        </CardContent>
      </Card>
    )
  }

  const gated = step ? stepById(step) : null
  const open = CALC_STEPS.filter(s => s.href && !needsAccount(s.id))

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      {gated && (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zon-muted">
          Step {gated.n} of {TOTAL_STEPS} · {gated.label}
        </p>
      )}
      <h1 className="mb-3 text-2xl font-bold text-zon-ink">
        {access === 'anonymous'
          ? 'This step needs a free account'
          : 'One thing before the numbers'}
      </h1>
      {gated && <p className="mb-4 text-sm text-zon-body">{gated.blurb}.</p>}
      <p className="mb-4 text-sm text-zon-body">
        The first four steps tell you how big a system to buy. Get one of those wrong and you
        have a disappointing December. From here on the numbers decide whether a cable runs hot,
        a fuse opens in time, or an inverter survives a cold morning.
      </p>
      <p className="mb-6 text-sm text-zon-body">
        {access === 'anonymous'
          ? 'So before we show them, we ask you to make an account and agree to the terms: these are estimates to check against your equipment’s datasheets and your local electrical code, not a finished design. It takes an email address and one tick.'
          : 'So before we show them, we ask you to agree to the current terms: these are estimates to check against your equipment’s datasheets and your local electrical code, not a finished design.'}
      </p>

      {action}

      <p className="mt-8 border-t border-zon-rule pt-4 text-xs text-zon-muted">
        Open to everyone, no account needed:{' '}
        {open.map((s, i) => (
          <span key={s.id}>
            {i > 0 && ' · '}
            <Link href={s.href!} className="underline hover:no-underline">
              {s.label}
            </Link>
          </span>
        ))}
        , and every{' '}
        <Link href="/guides" className="underline hover:no-underline">
          guide
        </Link>
        .
      </p>
    </div>
  )
}
