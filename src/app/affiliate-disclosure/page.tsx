// DRAFT — written as a reasonable first pass, not by a lawyer. Must be reviewed by
// qualified legal counsel before ZonZelf relies on it in production, alongside the
// disclaimer and terms (roadmap: "Legal: professional review before production").
import Link from 'next/link'
import { Info } from 'lucide-react'
import { SHOPS } from '@/lib/affiliate'

export const metadata = {
  title: 'Affiliate disclosure — ZonZelf',
  description:
    'Which links on ZonZelf are paid, which are not, and why a commission never decides what we recommend.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-semibold text-zon-ink">{title}</h2>
      <div className="space-y-3 leading-relaxed text-zon-body">{children}</div>
    </section>
  )
}

export default function AffiliateDisclosurePage() {
  // Read from the same registry the links are built from, so this page reports
  // what is actually configured rather than what someone remembered to write
  // down. A programme going live changes this table on the next deploy without
  // anyone editing this file — which is the point, because a disclosure page
  // that has drifted from the truth is worse than none.
  const live = SHOPS.filter(s => s.template)
  const notLive = SHOPS.filter(s => !s.template)

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-zon-ink">Affiliate disclosure</h1>
      <p className="mb-6 text-sm text-zon-muted">Last updated: 15 September 2026</p>

      <div className="mb-8 flex items-start gap-3 rounded-lg border border-zon-blue-tint bg-zon-blue-tint p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-zon-blue" aria-hidden="true" />
        <p className="text-sm text-zon-body">
          The short version: some links to shops earn us a commission, you never pay more
          because of it, and it has no influence on what the calculators tell you or which
          products they list.
        </p>
      </div>

      <Section title="What an affiliate link is">
        <p>
          When a battery on ZonZelf links out to a shop, that link sometimes carries a code
          identifying us. If you buy something after clicking it, the shop pays us a small
          percentage of the sale — usually 5–9%. The price you pay is exactly the same as if
          you had typed the shop&rsquo;s address in yourself. Nothing is added on top for you.
        </p>
        <p>
          This is how ZonZelf is paid for. There is no subscription, the monitoring side is
          free, and we would rather tell you plainly where the money comes from than bury it.
        </p>
      </Section>

      <Section title="Which links are paid right now">
        {live.length === 0 ? (
          <p>
            <strong className="font-semibold text-zon-ink">None of them.</strong> We have not
            joined any affiliate programme yet, so every link on the site today is an ordinary
            link that earns us nothing. When that changes, this page will say so and a notice
            will appear next to the links themselves — you will not have to come here to find
            out.
          </p>
        ) : (
          <>
            <p>We currently earn a commission on links to:</p>
            <ul className="list-disc space-y-1 pl-5">
              {live.map(s => (
                <li key={s.host}>
                  <span className="font-medium text-zon-ink">{s.name}</span>{' '}
                  <span className="text-zon-muted">({s.host})</span>
                </li>
              ))}
            </ul>
            {notLive.length > 0 && (
              <p>
                Links to {notLive.map(s => s.name).join(', ')} earn us nothing — they are there
                because the product belongs in the list, not because it pays.
              </p>
            )}
          </>
        )}
        <p>
          Wherever a paid link appears, a notice appears with it, before you click, on the same
          part of the page. The links are also tagged{' '}
          <code className="rounded bg-zon-rule-soft px-1 py-0.5 text-xs">rel=&quot;sponsored&quot;</code>{' '}
          so that search engines and browser tools can see the same thing you do.
        </p>
      </Section>

      <Section title="What a commission does not buy">
        <p>
          <strong className="font-semibold text-zon-ink">
            No product appears on ZonZelf because it pays better, and none is ranked higher for
            it.
          </strong>{' '}
          This is the rule the rest of the site depends on. If you cannot trust the battery
          list, there is no reason to trust the calculator that sized it.
        </p>
        <p>Concretely, a commission has no effect on:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-zon-ink">Which batteries are listed.</span> A
            model is added when we can read its specifications from the manufacturer&rsquo;s own
            datasheet and check them. Several brands in our catalogue — Victron in particular —
            pay us nothing at all and are listed anyway, because leaving them out would make the
            comparison worse.
          </li>
          <li>
            <span className="font-medium text-zon-ink">The order they appear in.</span> Battery
            options are sorted by capacity, smallest first, so the list lines up with the size
            you asked for. Not by price, not by commission.
          </li>
          <li>
            <span className="font-medium text-zon-ink">What the calculators say.</span> The
            maths runs on your numbers and published figures. It does not know which products
            pay us, because nothing in that code has access to it.
          </li>
          <li>
            <span className="font-medium text-zon-ink">The guides.</span> No guide, glossary
            entry, or explanation on this site is sponsored, paid for, or reviewed by a
            manufacturer or shop before publication.
          </li>
        </ul>
      </Section>

      <Section title="Specification links are never paid">
        <p>
          Every battery links to the manufacturer&rsquo;s own datasheet or specification page,
          so you can check our numbers against the source. Those citations are never tagged and
          never earn us anything — they exist so you can verify what we have told you, and a
          citation that quietly earned a commission would not be a citation.
        </p>
      </Section>

      <Section title="About the prices">
        <p>
          Prices are read automatically from the shop&rsquo;s own product page and shown with
          the date they were read. They are a snapshot, not a live quote: stock, shipping, tax,
          and promotions all change, and the shop&rsquo;s own page is always the authority. If a
          price has gone too long without being confirmed, we stop showing it rather than repeat
          a number we can no longer vouch for.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          If something on this page is unclear, or a link looks like it is not behaving the way
          this describes, email{' '}
          <a
            href="mailto:hello@zonzelf.com"
            className="text-zon-gold-deep underline hover:no-underline"
          >
            hello@zonzelf.com
          </a>
          . See also our{' '}
          <Link href="/disclaimer" className="text-zon-gold-deep underline hover:no-underline">
            disclaimer
          </Link>{' '}
          and{' '}
          <Link href="/terms" className="text-zon-gold-deep underline hover:no-underline">
            terms of service
          </Link>
          .
        </p>
      </Section>
    </div>
  )
}
