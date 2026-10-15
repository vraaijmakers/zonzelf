import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import AcceptTermsForm from '@/components/auth/AcceptTermsForm'
import { TOTAL_STEPS, stepById, type StepId } from '@/lib/calc-steps'
import { cn } from '@/lib/utils'
import type { TermsAccess } from '@/lib/terms'

/**
 * What a reader sees in place of a calculator step they may not use yet.
 *
 * Two readers land here: one with no account, who is offered one, and one who
 * is signed in but has not agreed to the current terms (an older account, or
 * the terms changed), who is asked to. Both are told why in plain English, and
 * that the guides stay open.
 */
export default function TermsGate({
  access,
  next,
  step,
}: {
  access: Exclude<TermsAccess, 'granted'>
  /** Where to send the reader once they have an account and have agreed. */
  next: string
  step: StepId
}) {
  const query = `?next=${encodeURIComponent(next)}`
  const gated = stepById(step)

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zon-muted">
        Step {gated.n} of {TOTAL_STEPS} · {gated.label}
      </p>
      <h1 className="mb-3 text-2xl font-bold text-zon-ink">
        {access === 'anonymous'
          ? 'The calculators need a free account'
          : 'One thing before the numbers'}
      </h1>
      <p className="mb-4 text-sm text-zon-body">{gated.blurb}.</p>
      <p className="mb-4 text-sm text-zon-body">
        These calculators turn your numbers into a system: how big a bank, how many panels, which
        cable, which fuse, which inverter settings. You will build from what they say, so we ask
        you to agree to the terms first. The numbers are estimates to check against your
        equipment&apos;s datasheets and your local electrical code, not a finished design.
      </p>
      <p className="mb-6 text-sm text-zon-body">
        {access === 'anonymous'
          ? 'It takes an email address and one tick. What you type into the calculators stays in your browser.'
          : 'The terms have changed since you last agreed, or this account was made before we asked. One tick and you are back in.'}
      </p>

      {access === 'anonymous' ? (
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
      )}

      <p className="mt-8 border-t border-zon-rule pt-4 text-xs text-zon-muted">
        No account needed to read the{' '}
        <Link href="/guides" className="underline hover:no-underline">
          guides
        </Link>
        {' '}— including{' '}
        <Link href="/guides/sizing-a-system" className="underline hover:no-underline">
          how to size a system
        </Link>{' '}
        by hand.
      </p>
    </div>
  )
}
