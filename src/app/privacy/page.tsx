// DRAFT — written as a reasonable first pass, not by a lawyer. Must be reviewed by
// qualified legal counsel (including for GDPR compliance, given the EU/NL user base)
// before ZonZelf relies on this in production.
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — ZonZelf',
  description: 'What data ZonZelf collects and how it is used.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: 20 August 2026</p>

      <p className="text-gray-700 leading-relaxed">
        This page explains what data ZonZelf collects when you use the site, why, and what
        control you have over it. See also our{' '}
        <Link href="/terms" className="text-yellow-700 hover:underline">Terms of Service</Link>.
      </p>

      <Section title="What we collect">
        <p>If you just browse guides and use calculators without an account, we don&apos;t collect any personal data — calculator inputs stay in your browser.</p>
        <p>If you create an account, we collect:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Account data:</strong> your email address, via our authentication provider (Supabase).</li>
          <li><strong>Project data:</strong> anything you save to your dashboard — system specs, roadmap items, saved calculator results.</li>
          <li><strong>Monitoring data:</strong> once live monitoring is available, the solar/battery readings your own monitoring agent sends us (e.g. via <code className="text-sm bg-gray-100 px-1 rounded">/api/ingest</code>), so we can display them back to you and, if you opt in, contribute anonymized readings to community averages.</li>
        </ul>
      </Section>

      <Section title="Cookies">
        <p>
          We use strictly necessary cookies set by our authentication provider to keep you
          signed in. We do not currently use advertising or third-party tracking cookies. If
          that changes, this page — and, where required, an on-site consent banner — will be
          updated first.
        </p>
      </Section>

      <Section title="How we use your data">
        <ul className="list-disc pl-6 space-y-1">
          <li>To operate your account, dashboard, and monitoring.</li>
          <li>To show community aggregate data (e.g. average peak sun hours by region) — only from users who opt in, and only in aggregated/anonymized form.</li>
          <li>To communicate service-related messages (password resets, important changes).</li>
        </ul>
        <p>We do not sell your personal data.</p>
      </Section>

      <Section title="Where your data lives">
        <p>
          Account and project data is stored in our database (Supabase, Postgres) with
          row-level security so only you and authorized ZonZelf operators can access it. We do
          not store payment card details ourselves — subscription billing, once launched, is
          handled by a third-party payment processor.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          ZonZelf is not opening accounts at the moment, so for almost every visitor there is no
          account and no stored personal data to exercise rights over: the calculators and guides
          run without one. There is no dashboard yet, and no self-service deletion flow — so
          rather than promise one, we have closed sign-ups until it exists.
        </p>
        <p>
          If you already hold an account from an earlier version of the site, you can request
          access to or deletion of it and its associated data by contacting us, and we will
          action it by hand. If you are in the EU/EEA, you have rights under the GDPR, including
          access, correction, deletion, and data portability.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We&apos;ll update the &quot;last updated&quot; date above whenever this policy changes,
          and post material changes prominently before they take effect.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          [TODO: publish a real, monitored contact channel here — an email address or a contact
          form — before this page is relied on. It should not point people at the source code
          repository. This matters more here than elsewhere on the site: GDPR data-access and
          deletion requests need a reachable channel.]
        </p>
      </Section>
    </div>
  )
}
