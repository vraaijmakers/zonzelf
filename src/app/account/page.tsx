import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TERMS_VERSION } from '@/lib/terms'
import AcceptTermsForm from '@/components/auth/AcceptTermsForm'
import DeleteAccountForm from '@/components/auth/DeleteAccountForm'

export const metadata = {
  title: 'Your account — ZonZelf',
}

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
})

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-zon-rule pt-6">
      <h2 className="text-base font-semibold text-zon-ink mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-zon-body">{children}</div>
    </section>
  )
}

// Everything ZonZelf holds about an account, and the way to remove it. This
// page is what let sign-ups reopen: the privacy policy promises deletion, and
// until this existed an operator had to do it by hand.
export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login?next=/account')
  }

  const [{ data: acceptances, error }, { data: profile }] = await Promise.all([
    supabase
      .from('terms_acceptances')
      .select('terms_version, accepted_at')
      .eq('user_id', user.id)
      .order('accepted_at', { ascending: false }),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])
  if (error) {
    console.error('terms_acceptances lookup failed:', error.message)
  }

  const current = (acceptances ?? []).some(a => a.terms_version === TERMS_VERSION)
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-zon-ink mb-2">Your account</h1>
      <p className="text-sm text-zon-body">
        Signed in as <span className="font-medium text-zon-ink">{user.email}</span>. This page
        shows everything ZonZelf stores about you.
      </p>

      <Section title="What we store">
        <ul className="list-disc pl-5 space-y-1">
          <li>Your email address, so we can send you a sign-in link.</li>
          <li>Which version of the terms you agreed to, and when.</li>
        </ul>
        <p>
          What you type into the calculators is not on this list. It is saved in your browser
          and never sent to us.
        </p>
      </Section>

      <Section title="Terms you agreed to">
        {error ? (
          <p className="text-zon-red">
            We could not load this just now. Reload the page to try again.
          </p>
        ) : (acceptances ?? []).length === 0 ? (
          <p>Nothing on record yet.</p>
        ) : (
          <ul className="space-y-1">
            {(acceptances ?? []).map(a => (
              <li key={a.terms_version}>
                <Link href="/terms" className="underline hover:no-underline">
                  Terms of {a.terms_version}
                </Link>{' '}
                — agreed on {DATE.format(new Date(a.accepted_at))}
                {a.terms_version === TERMS_VERSION ? ' (current)' : ''}
              </li>
            ))}
          </ul>
        )}
        {!error && !current && (
          <div className="rounded-lg border border-zon-gold-light bg-zon-gold-tint p-4">
            <p className="mb-3">
              You have not agreed to the current terms, so the calculators are closed to you
              for now.
            </p>
            <AcceptTermsForm next="/account" />
          </div>
        )}
      </Section>

      <Section title="Delete your account">
        {isAdmin ? (
          <p>
            This is an admin account, and those are removed by hand so the site is never left
            without one. Ask another operator, or remove the role first.
          </p>
        ) : (
          <>
            <p>
              Deleting removes your email address and your terms record from our database
              immediately. You can make a new account later; you would be asked to agree to the
              terms again.
            </p>
            <DeleteAccountForm />
          </>
        )}
      </Section>
    </div>
  )
}
