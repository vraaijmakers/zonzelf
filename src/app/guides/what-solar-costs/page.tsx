import type { ReactNode } from 'react'
import Link from 'next/link'
import { Receipt, Calculator, Battery, Sun } from 'lucide-react'
import {
  GuideBreadcrumb, GuideHeader, Tldr, Note, Warn, GuideDisclaimer, NextSteps,
} from '@/components/guides/GuideChrome'
import { GuideClaims } from '@/components/guides/ClaimStamp'
import {
  DIY_9KW_BOM, DIY_9KW_WATTS, US_INSTALLED_USD_PER_W, SECTION_232, CREDIT_25D,
  INSTALLED_COST_SHARE, pricedOnLabel,
  lineTotal, bomTotal, costLadder, floorUpliftFraction, upliftAgainstSystem, usd,
} from '@/lib/solar-cost'

export const metadata = {
  title: 'What a Solar System Should Cost — ZonZelf Guide',
  description:
    'What the parts actually cost, why an installed American system costs three times the same hardware elsewhere, what the December 2026 import floor does to a pallet of modules, and why the 30% credit is gone.',
}

/**
 * The first question every beginner asks, and the one this site could not
 * answer at all until now.
 *
 * WHY IT IS A GUIDE AND NEVER A CALCULATOR. CLAUDE.md makes cost calculators a
 * non-goal on the Winter-versus-Jeppesen reasoning: a payback number
 * mechanically converts a reader's inputs into a financial output, with no
 * code to cite and no derivation ending in a standard. NEC 310.16 has nothing
 * to say about money. Published example figures a reader compares themselves
 * against are the protected shape; a widget that answers for them is not.
 * Nothing on this page accepts input.
 *
 * WHY IT SURVIVES THE PRICES MOVING, which is the objection that shaped it.
 * Three layers, and they are kept apart deliberately:
 *
 *   STRUCTURAL — soft costs are what make an American system expensive, and a
 *   tariff that is a rounding error on an installed job is a real number for
 *   someone buying bare pallets. Those claims outlive every price move here.
 *
 *   CITED — the Section 232 floor and the 25D termination are statutes, so
 *   they carry a citation, a checked-on date, and in the first case a
 *   published effective date that makes the review come due on 4 Dec 2026
 *   however recently anyone looked. See src/lib/guide-claims.ts.
 *
 *   LIVE — no live price is typed into this page. Battery prices with an
 *   as-of date live on /calculators/battery, which expires them at 45 days.
 *   The module $/W equivalent waits on panel_models; until that exists, this
 *   page links rather than quotes.
 *
 * Every total is computed by src/lib/solar-cost.ts rather than written down,
 * so the table cannot drift away from its own line items.
 */

function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-3 mt-10 text-2xl font-bold text-zon-ink scroll-mt-24">
      {children}
    </h2>
  )
}

function P({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-zon-body">{children}</p>
}

const pct = (f: number) => `${Math.round(f * 100)}%`
const pct1 = (f: number) => `${(f * 100).toFixed(1)}%`

export default function WhatSolarCostsGuide() {
  const ladder = costLadder(DIY_9KW_BOM, DIY_9KW_WATTS)
  const diyRung = ladder[1]
  const installedTotal = DIY_9KW_WATTS * US_INSTALLED_USD_PER_W
  const onModule = floorUpliftFraction(SECTION_232.medianModuleUsdPerW, SECTION_232.moduleFloorUsdPerW)
  const onSystem = upliftAgainstSystem(
    DIY_9KW_WATTS, SECTION_232.medianModuleUsdPerW, SECTION_232.moduleFloorUsdPerW, US_INSTALLED_USD_PER_W,
  )
  const moduleLine = DIY_9KW_BOM[0]
  const extraOnPallet =
    Math.max(0, SECTION_232.moduleFloorUsdPerW - SECTION_232.medianModuleUsdPerW) * DIY_9KW_WATTS

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <GuideBreadcrumb current="What a Solar System Should Cost" />
      <GuideHeader
        badges={['Buying', 'Beginner']}
        minutes="9 min read"
        title="What a Solar System Should Cost"
        lede="The parts are not the expensive part of an American solar system. Here is where the money actually goes, what a real bill of materials looks like, and the two policy changes that move the number in 2026."
      />

      <Tldr>
        <p>
          Hardware is roughly an eighth of what a homeowner pays an installer. The rest is
          sales, marketing, profit and labour — which is why doing it yourself changes the
          arithmetic so much more than shopping harder for panels does. A {DIY_9KW_WATTS / 1000} kW
          basket of parts plus permits comes to about {usd(diyRung.total)}, or{' '}
          <strong>${diyRung.perWatt.toFixed(2)}/W</strong>, against roughly{' '}
          <strong>${US_INSTALLED_USD_PER_W.toFixed(2)}/W</strong> installed.
        </p>
        <p>
          Two things move that in 2026: the 30% federal credit is <strong>gone</strong>, and an
          import price floor lands on 4 December. The floor is a rounding error for a homeowner
          buying an installed system and a real number for you, because you are buying the part
          it applies to and nothing else.
        </p>
      </Tldr>

      <GuideDisclaimer />

      <H2 id="where-the-money-goes">Why an American system costs what it does</H2>
      <P>
        The United States pays roughly three times what Australia pays to install the same
        hardware. That is not a hardware story — the panels come off the same lines and cross
        the same ocean. It is a soft-cost story, and the numbers are lopsided enough to be worth
        sitting with.
      </P>

      <div className="mb-4 overflow-x-auto rounded-xl border border-zon-rule">
        <table className="w-full text-sm">
          <thead className="bg-zon-cream text-left">
            <tr>
              <th className="px-4 py-2 font-semibold text-zon-ink">Share of an installed US system</th>
              <th className="px-4 py-2 font-semibold text-zon-ink">Portion</th>
            </tr>
          </thead>
          <tbody>
            {INSTALLED_COST_SHARE.map(s => (
              <tr key={s.label} className="border-t border-zon-rule-soft align-top">
                <td className="px-4 py-2 text-zon-body">
                  {s.label}
                  <span className="block text-xs text-zon-muted">{s.note}</span>
                </td>
                <td className="px-4 py-2 font-semibold text-zon-ink">{pct(s.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <P>
        Read the first and last rows together. In the first half of 2021, the cost of{' '}
        <em>finding the customer</em> was about $0.75 per watt — more than the modules
        themselves cost that year. A homeowner who negotiates hard on panel brand is haggling
        over the smallest line on the invoice.
      </P>
      <Note>
        <p>
          This is the part of the page that does not go out of date when prices move. The
          specific percentages get revised with each year&apos;s benchmark, but the shape — sales
          and overhead dwarfing the hardware — is the structural fact, and it is what makes
          doing the work yourself worth so much more than shopping well.
        </p>
      </Note>

      <H2 id="bill-of-materials">What the parts actually cost</H2>
      <P>
        A worked basket for a {DIY_9KW_WATTS / 1000} kW array, so the number is not abstract.
        These are example prices from {pricedOnLabel()} — they
        are an illustration, not a quote, and the point of showing them is that you can redo the
        sum with whatever your own supplier is charging this week.
      </P>

      <div className="mb-4 overflow-x-auto rounded-xl border border-zon-rule">
        <table className="w-full text-sm">
          <thead className="bg-zon-cream text-left">
            <tr>
              <th className="px-4 py-2 font-semibold text-zon-ink">Item</th>
              <th className="px-4 py-2 font-semibold text-zon-ink">Qty</th>
              <th className="px-4 py-2 font-semibold text-zon-ink">Each</th>
              <th className="px-4 py-2 text-right font-semibold text-zon-ink">Line</th>
            </tr>
          </thead>
          <tbody>
            {DIY_9KW_BOM.map(l => (
              <tr key={l.item} className="border-t border-zon-rule-soft align-top">
                <td className="px-4 py-2 text-zon-body">
                  {l.item}
                  {l.note && <span className="block text-xs text-zon-muted">{l.note}</span>}
                </td>
                <td className="px-4 py-2 text-zon-body">{l.qty}</td>
                <td className="px-4 py-2 text-zon-body">{usd(l.unitUsd)}</td>
                <td className="px-4 py-2 text-right font-medium text-zon-ink">{usd(lineTotal(l))}</td>
              </tr>
            ))}
            <tr className="border-t border-zon-rule bg-zon-cream">
              <td className="px-4 py-2 font-semibold text-zon-ink" colSpan={3}>
                Everything above
              </td>
              <td className="px-4 py-2 text-right font-semibold text-zon-ink">
                {usd(bomTotal(DIY_9KW_BOM))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <P>
        Doing it yourself deletes the labour line. It does not delete the county, so the honest
        comparison is a ladder rather than a single number:
      </P>

      <div className="mb-4 overflow-x-auto rounded-xl border border-zon-rule">
        <table className="w-full text-sm">
          <thead className="bg-zon-cream text-left">
            <tr>
              <th className="px-4 py-2 font-semibold text-zon-ink">What you are counting</th>
              <th className="px-4 py-2 font-semibold text-zon-ink">Total</th>
              <th className="px-4 py-2 font-semibold text-zon-ink">Per watt</th>
            </tr>
          </thead>
          <tbody>
            {ladder.map(r => (
              <tr key={r.label} className="border-t border-zon-rule-soft align-top">
                <td className="px-4 py-2 text-zon-body">
                  {r.label}
                  <span className="block text-xs text-zon-muted">{r.note}</span>
                </td>
                <td className="px-4 py-2 text-zon-body">{usd(r.total)}</td>
                <td className="px-4 py-2 font-semibold text-zon-ink">${r.perWatt.toFixed(2)}/W</td>
              </tr>
            ))}
            <tr className="border-t border-zon-rule bg-zon-cream align-top">
              <td className="px-4 py-2 text-zon-body">
                The same array, bought installed
                <span className="block text-xs text-zon-muted">
                  A typical American installed price for {DIY_9KW_WATTS / 1000} kW.
                </span>
              </td>
              <td className="px-4 py-2 text-zon-body">{usd(installedTotal)}</td>
              <td className="px-4 py-2 font-semibold text-zon-ink">
                ${US_INSTALLED_USD_PER_W.toFixed(2)}/W
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Note>
        <p>
          <strong>The claim here is the ratio, not the dollars.</strong> Module prices move week
          to week, and every figure in those tables will drift. What does not drift is the reason
          the gap exists: you are not paying for customer acquisition, a sales commission, or a
          margin on someone else&apos;s labour. If your own prices come in 20% higher than ours,
          the argument is unchanged.
        </p>
      </Note>

      <H2 id="import-floor">The import floor, and who it is really a big number for</H2>
      <P>
        A Section 232 proclamation signed on 6 August 2026 sets a <em>minimum import price</em>{' '}
        of <strong>${SECTION_232.moduleFloorUsdPerW.toFixed(2)}/W</strong> on modules and{' '}
        <strong>${SECTION_232.cellFloorUsdPerW.toFixed(2)}/W</strong> on cells, alongside a{' '}
        {pct(SECTION_232.adValoremRate)} ad valorem duty. It takes effect at 12:01 a.m. Eastern
        on <strong>4 December 2026</strong>.
      </P>
      <P>
        A floor is not a duty. A module entering below it is treated as though it had been sold
        at it. When this was checked, modules were transacting near{' '}
        ${SECTION_232.medianModuleUsdPerW.toFixed(3)}/W, so the floor sits about{' '}
        <strong>{pct1(onModule)}</strong> above the market:
      </P>

      <div className="mb-4 rounded-xl border border-zon-rule bg-zon-cream px-4 py-3 font-mono text-sm text-zon-body">
        ${SECTION_232.moduleFloorUsdPerW.toFixed(2)} ÷ ${SECTION_232.medianModuleUsdPerW.toFixed(3)} − 1
        = {pct1(onModule)} on the module
      </div>

      <P>
        The trade press has largely shrugged at this, and against an installed system they are
        right to. Spread the same increase across a {usd(installedTotal)} job and it is{' '}
        <strong>{pct1(onSystem)}</strong> — inside the noise of which installer you picked.
      </P>
      <P>
        But that arithmetic only works if you are buying the whole job. You are buying the
        pallet. On the {moduleLine.qty} modules in the basket above, the floor is roughly{' '}
        <strong>{usd(extraOnPallet)}</strong> more on a{' '}
        {usd(lineTotal(moduleLine))} line — the same policy, divided by a much smaller number.
        The one audience for whom this floor is a real cost is the one nobody is writing for.
      </P>
      <Note>
        <p>
          We deliberately do not tell you what the floor and the {pct(SECTION_232.adValoremRate)}{' '}
          duty come to <em>combined</em>. How they stack depends on entered value, and we have
          not read a ruling that settles it. A number we cannot derive is not a number this site
          prints.
        </p>
      </Note>

      <H2 id="credit-gone">The 30% credit is gone, and the trap is the second sentence</H2>
      <Warn>
        <p>
          <strong>{CREDIT_25D.repealedBy} terminated {CREDIT_25D.statute}</strong> — the{' '}
          {pct(CREDIT_25D.rate)} residential clean energy credit — for expenditures made after{' '}
          <strong>31 December 2025</strong>. No cost figure anywhere on this site assumes 30% off,
          and neither should yours.
        </p>
        <p>
          The trap: {CREDIT_25D.statute} treats an expenditure as made when the{' '}
          <strong>original installation is completed</strong>, not when you paid. Buying panels in
          December 2025 for a system you energised in 2026 earns nothing. The people most likely
          to be caught by this are exactly the ones who bought early to catch the credit.
        </p>
      </Warn>

      <H2 id="not-priced">What we deliberately do not price</H2>
      <P>
        Three lines move more than anything above and we have no honest source for any of them,
        so we name them instead of inventing numbers:
      </P>
      <ul className="mb-4 ml-5 list-disc space-y-2 text-zon-body">
        <li>
          <strong>Freight.</strong> Pallets are heavy and awkward, and quotes vary by more than
          the panel price does. Get a real quote before you budget.
        </li>
        <li>
          <strong>Local permitting and inspection.</strong> The {usd(500)} in the basket is a
          placeholder. Your county sets this, and the spread between counties is larger than the
          spread between panel brands.
        </li>
        <li>
          <strong>Your own time.</strong> The labour line is what DIY deletes, which means you
          are paying it in weekends. That is a real price; it is just not in dollars.
        </li>
      </ul>

      <H2 id="no-calculator">Why there is no cost calculator here</H2>
      <P>
        You may have noticed this page has tables and no input boxes. That is deliberate and it
        is permanent. Everywhere else on this site, a calculator shows you the derivation and
        cites the code it came from — NEC 310.16 for a conductor, 690.8 for a string. There is no
        equivalent for money. A payback figure would convert your numbers into a financial answer
        with no standard behind it and no way for you to check our work.
      </P>
      <P>
        So we publish the figures and the arithmetic, and you do the comparison. If you want the
        one number on this site that <em>is</em> kept current automatically, the battery shelf
        carries real retailer prices with the date each was last confirmed:
      </P>
      <div className="mb-4">
        <Link
          href="/calculators/battery"
          className="inline-flex items-center gap-2 rounded-lg bg-zon-gold px-4 py-2 text-sm font-semibold text-zon-ink hover:bg-zon-gold-deep"
        >
          <Battery className="h-4 w-4" />
          Dated battery prices →
        </Link>
      </div>

      <GuideClaims slug="what-solar-costs" />

      <div className="mt-10">
        <NextSteps
          items={[
            {
              href: '/guides/choosing-panels',
              title: 'Choosing panels',
              sub: 'Why three 400 W panels are not two 600 W panels',
              Icon: Sun,
            },
            {
              href: '/calculators/system',
              title: 'Size the whole system',
              sub: 'Seven steps, with the disagreements between them made visible',
              Icon: Calculator,
            },
            {
              href: '/guides/batteries',
              title: 'Battery types',
              sub: 'Where the largest single line in your budget goes',
              Icon: Receipt,
            },
          ]}
        />
      </div>
    </div>
  )
}
