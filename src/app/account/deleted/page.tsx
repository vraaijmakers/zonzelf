import Link from 'next/link'

export const metadata = {
  title: 'Account deleted — ZonZelf',
}

export default function AccountDeletedPage() {
  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold text-zon-ink mb-2">Your account is deleted</h1>
      <p className="text-sm text-zon-body mb-4">
        Your email address and the record of the terms you agreed to are gone from our database.
        There is nothing left to ask us to remove.
      </p>
      <p className="text-sm text-zon-body mb-6">
        What you typed into the calculators was never sent to us. It is still saved in this
        browser, and clearing this site&apos;s data in your browser settings removes it.
      </p>
      <p className="text-sm text-zon-muted">
        The{' '}
        <Link href="/guides" className="underline hover:no-underline">
          guides
        </Link>{' '}
        still work without an account.
      </p>
    </div>
  )
}
