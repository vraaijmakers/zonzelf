// DRAFT — written as a reasonable first pass, not by a lawyer. Must be reviewed by
// qualified legal counsel before ZonZelf relies on this in production. The governing-law
// clause needs a confirmed legal entity/jurisdiction before launch.
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — ZonZelf',
  description: 'The terms that apply when you use ZonZelf.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: 20 August 2026</p>

      <p className="text-gray-700 leading-relaxed">
        These terms govern your use of ZonZelf (zonzelf.com / zonzelf.app), a community
        platform for DIY off-grid and hybrid solar builders. By creating an account or using
        the site, you agree to these terms. Please also read our{' '}
        <Link href="/disclaimer" className="text-yellow-700 hover:underline">Disclaimer</Link> and{' '}
        <Link href="/privacy" className="text-yellow-700 hover:underline">Privacy Policy</Link>,
        which are part of these terms.
      </p>

      <Section title="The service">
        <p>
          ZonZelf provides free educational guides, sizing calculators, a community roadmap,
          and (for account holders) brand-agnostic live monitoring of your solar/battery system,
          plus a paid monitoring subscription tier. We may add, change, or remove features at
          any time, and free features today are not a promise they stay free forever.
        </p>
      </Section>

      <Section title="Accounts">
        <p>
          You need an account to use monitoring, the dashboard, and roadmap contributions. You
          are responsible for keeping your login credentials secure and for all activity under
          your account. Tell us if you believe your account has been compromised.
        </p>
      </Section>

      <Section title="Subscriptions and payment">
        <p>
          Live monitoring beyond the free tier is offered as a paid subscription. Pricing,
          billing cycle, and cancellation terms are shown at checkout when that feature launches.
          Subscriptions are billed in advance and, unless stated otherwise at checkout, are
          non-refundable for partial billing periods.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Use ZonZelf for anything unlawful, or to infringe someone else&apos;s rights.</li>
          <li>Post content that is fraudulent, abusive, or knowingly false safety information.</li>
          <li>Attempt to access another user&apos;s account or data without authorization.</li>
          <li>Interfere with or disrupt the service (scraping at scale, denial-of-service, etc.).</li>
          <li>Reverse-engineer or resell the monitoring service without our written permission.</li>
        </ul>
      </Section>

      <Section title="Your content">
        <p>
          You keep ownership of anything you post (roadmap comments, project data, etc.). By
          posting, you grant ZonZelf a license to display and store it as part of operating the
          service. You are responsible for what you post — see the{' '}
          <Link href="/disclaimer" className="text-yellow-700 hover:underline">Disclaimer</Link>{' '}
          on community content.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          You may stop using ZonZelf and delete your account at any time. We may suspend or
          terminate accounts that violate these terms, and will make reasonable efforts to
          notify you first except where the violation requires immediate action.
        </p>
      </Section>

      <Section title="Disclaimers and limitation of liability">
        <p>
          ZonZelf is provided &quot;as is&quot; without warranties of any kind. See the{' '}
          <Link href="/disclaimer" className="text-yellow-700 hover:underline">Disclaimer</Link>{' '}
          for the specific terms covering guides, calculators, and DIY installations — those
          terms are incorporated into this agreement. To the maximum extent permitted by law,
          ZonZelf&apos;s total liability for any claim arising from your use of the service is
          limited to the amount you paid ZonZelf in the twelve months before the claim, or €100
          if you have not paid ZonZelf anything.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms as the service evolves. We&apos;ll post the updated version
          here with a new &quot;last updated&quot; date; continued use after a change means you
          accept the update.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          [TODO: confirm legal entity and jurisdiction — these terms are currently a draft and
          do not yet name the governing law or the operating entity.]
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about these terms? Reach out via the contact details on our GitHub repository.</p>
      </Section>
    </div>
  )
}
