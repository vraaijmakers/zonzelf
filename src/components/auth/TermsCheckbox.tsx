import Link from 'next/link'

/**
 * The "I agree" tick, worded once so the sign-up form and the re-acceptance
 * form can never ask for two different things.
 *
 * Unticked by default and `required`: assent has to be something the reader
 * did. The links open in a new tab so reading the terms does not throw away
 * the form.
 */
export default function TermsCheckbox({
  id,
  checked,
  onChange,
}: {
  id: string
  /** Leave both unset for an uncontrolled box inside a plain form. */
  checked?: boolean
  onChange?: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        name="agree"
        type="checkbox"
        required
        checked={checked}
        onChange={onChange ? e => onChange(e.target.checked) : undefined}
        className="mt-0.5 h-4 w-4 shrink-0 accent-zon-gold-deep"
      />
      <label htmlFor={id} className="text-sm text-zon-body">
        I have read and agree to the{' '}
        <Link href="/terms" target="_blank" className="underline hover:no-underline">
          Terms of Service
        </Link>{' '}
        and the{' '}
        <Link href="/disclaimer" target="_blank" className="underline hover:no-underline">
          Disclaimer
        </Link>
        . I understand ZonZelf&apos;s numbers are estimates, and that I must check them against
        my equipment&apos;s datasheets and my local electrical code before I build.
      </label>
    </div>
  )
}
