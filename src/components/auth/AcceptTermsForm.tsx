'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import TermsCheckbox from '@/components/auth/TermsCheckbox'
import { acceptTerms } from '@/app/account/actions'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="w-full bg-zon-gold text-zon-ink hover:bg-zon-gold-deep"
    >
      {pending ? 'Saving…' : 'Agree and continue'}
    </Button>
  )
}

/**
 * For a signed-in reader with no acceptance of the current terms on record: an
 * account from before the gate existed, or anyone after the terms change.
 */
export default function AcceptTermsForm({ next }: { next: string }) {
  return (
    <form action={acceptTerms} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <TermsCheckbox id="accept-terms" />
      <Submit />
    </form>
  )
}
