/**
 * The claims each guide is on the hook for re-reading, and when someone last did.
 *
 * WHY A REGISTRY RATHER THAN A DATE PER PAGE. A guide is not uniformly
 * perishable. /guides/one-ground-system explains why two ground rods are worse
 * than one — physics, good indefinitely — and separately states which NEC
 * edition deleted 690.47(B), which is true until the next cycle. One
 * "reviewed on" stamp for the page would either nag about the physics or let
 * the code citation rot, and in practice it does the second: the page keeps
 * looking freshly reviewed because somebody fixed a typo in the physics half.
 * The unit that decays is the CLAIM, so the claim is what carries the date.
 *
 * WHY THE DATES BELOW ARE NOT ALL TODAY, which is the part worth defending.
 * Each checkedOn is the date the claim was last WRITTEN OR REVISED by a human
 * — taken from git log on the file, not from the day this registry was
 * created. Stamping everything with today's date would have made the whole
 * board green on day one and silently reset four guides' worth of real age.
 * That is the failure this module exists to prevent, committed by the module
 * itself on its first commit. The ages below are therefore honest and a couple
 * of them are already old, which is the correct and useful starting state.
 *
 * WHAT IS DELIBERATELY ABSENT. No live prices, and there is no field here that
 * could hold one. A price renders from battery_models through
 * src/lib/battery-price.ts, which dates and expires it automatically; typing
 * one into a guide would put a number on the site that no mechanism can age
 * out. The one place a guide may state a live figure is by reading that same
 * source. See the header of content-freshness.ts for the three-layer split.
 *
 * ADDING A CLAIM: register anything a reader would act on that could become
 * untrue without this repo changing — a code citation, a statute, a price
 * floor, a product line-up, a class-typical figure. Do not register physics.
 */

import type { Claim } from './content-freshness'

export interface GuideClaims {
  /** Route slug under /guides. */
  slug: string
  /** Title as the guides index shows it, so CI can name the page usefully. */
  title: string
  claims: Claim[]
}

export const GUIDE_CLAIMS: GuideClaims[] = [
  {
    slug: 'one-ground-system',
    title: 'One Ground System, Not Two',
    claims: [
      {
        id: 'nec-690-47-edition-history',
        statement:
          'An array grounding electrode was mandatory in NEC 2011 and 2014 as 690.47(D), deleted in 2017, reinstated as permissive in 2020 as 690.47(B), and deleted again in the 2026 edition, which redirects to Article 250 Part III.',
        kind: 'technical',
        // The page already tells the reader to cite their own edition, which is
        // the right posture and is NOT a substitute for re-reading this: the
        // sentence names four specific editions and a fifth is what would
        // falsify it.
        checkedOn: '2026-09-13',
        source: 'NFPA 70 (NEC) 690.47, editions 2011 / 2014 / 2017 / 2020 / 2026',
      },
      {
        id: 'nec-690-45-egc-sizing',
        statement:
          'Equipment grounding conductors for PV circuits are sized per NEC 690.45, referring to Table 250.122.',
        kind: 'technical',
        checkedOn: '2026-09-13',
        source: 'NFPA 70 (NEC) 690.45 and Table 250.122',
      },
    ],
  },
  {
    slug: 'strings-and-mppt',
    title: 'Strings and MPPT',
    claims: [
      {
        id: 'nec-690-7-design-temperature',
        statement:
          "NEC 690.7 points at ASHRAE's extreme annual mean minimum design dry-bulb temperature for the cold-Voc calculation.",
        kind: 'technical',
        // Oldest claim in the registry, and it is the one that decides a
        // protection-register output. Age here is signal, not an oversight.
        checkedOn: '2026-08-30',
        source: 'NFPA 70 (NEC) 690.7; ASHRAE Fundamentals climatic design conditions',
      },
    ],
  },
  {
    slug: 'choosing-panels',
    title: 'Choosing Panels: Why 3 x 400 W Is Not 2 x 600 W',
    claims: [
      {
        id: 'panel-class-dimensions',
        statement:
          'A 400 W class module is about 1722 x 1134 mm and 21.5 kg (108 half-cell, 182 mm format); a 600 W class module is the 210 mm format and correspondingly larger.',
        kind: 'technical',
        // Hand-written and labelled class-typical because PanelSpec carries no
        // physical fields at all. This claim is what the "Panel choice: form
        // factor" roadmap item retires: once panels carry lengthMm/widthMm/
        // weightKg from their own datasheets, the table is computed from
        // admitted rows and this entry goes away rather than being re-dated.
        checkedOn: '2026-09-10',
        source: 'Class-typical for the 182 mm and 210 mm wafer formats; not any one product',
      },
      {
        id: 'nec-690-8-irradiance-factor',
        statement:
          'Continuous PV current is taken as 125% of Isc per NEC 690.8(A)(1).',
        kind: 'technical',
        checkedOn: '2026-09-10',
        source: 'NFPA 70 (NEC) 690.8(A)(1)',
      },
    ],
  },
  {
    slug: 'boats-and-rvs',
    title: 'A Boat Is Not a Small Cabin',
    claims: [
      {
        id: 'marine-rv-standards-not-opened',
        statement:
          'ABYC E-11, NFPA 1192, ISO 10133/13297 and EN 1648 govern boats and RVs; this site names them but has not opened them, so it gives no marine or RV numbers.',
        kind: 'technical',
        // Decays in BOTH directions, which is why it is registered: a new ABYC
        // edition falsifies the naming, and somebody here actually reading one
        // falsifies the disclaimer. The second is the likelier of the two and
        // the easier to forget to update.
        checkedOn: '2026-09-15',
        source: 'ABYC E-11; NFPA 1192; ISO 10133 / 13297; EN 1648 — named, not opened',
      },
    ],
  },
  {
    slug: 'what-solar-costs',
    title: 'What a Solar System Should Cost',
    claims: [
      {
        id: 'section-232-import-floor',
        statement:
          'A Section 232 proclamation of 6 August 2026 sets a minimum import price of $0.38/W on modules and $0.22/W on cells, plus a 15% ad valorem duty, effective 12:01 a.m. ET on 4 December 2026.',
        kind: 'policy',
        // THE REASON changesOn EXISTS. Age alone cannot catch this: the review
        // must come due on 4 Dec 2026 even if somebody re-read the
        // proclamation the day before, because what changes that morning is
        // the world, not our memory of it.
        checkedOn: '2026-09-15',
        changesOn: '2026-12-04',
        source: 'Presidential proclamation of 6 August 2026 under Section 232; figures confirmed against pv magazine USA and Anza',
      },
      {
        id: 'module-median-transacted-price',
        statement:
          'Modules were transacting at a median near $0.271/W, which is what puts the import floor about 40% above the market.',
        kind: 'policy',
        // The fastest-decaying figure on the site, and the one closest to the
        // line this project drew: a live price may not be typed into prose.
        // It is admitted here as a DATED MARKET OBSERVATION feeding a shown
        // division, not as a price a reader would pay — the page prints the
        // arithmetic so a reader can redo it with this week's number. When
        // panel_models exists it should render from there and this entry goes.
        checkedOn: '2026-09-15',
        source: 'Median transacted module price, September 2026, via Anza',
      },
      {
        id: 'section-25d-terminated',
        statement:
          'P.L. 119-21 section 70506 terminated 26 U.S.C. 25D, the 30% residential clean energy credit, for expenditures made after 31 December 2025 — and 25D treats an expenditure as made when the original installation is completed.',
        kind: 'policy',
        // No changesOn: this one has already happened. A repealed credit does
        // not un-repeal, so only the ordinary policy cadence applies, and it
        // is registered mainly so a successor credit does not go unnoticed.
        checkedOn: '2026-09-15',
        source: 'P.L. 119-21 section 70506; 26 U.S.C. 25D',
      },
      {
        id: 'us-installed-cost-share',
        statement:
          'Customer acquisition was about 23% of a residential system price in H1 2021 at roughly $0.75/W; marketing, profit and labour together are around 43% of an American installed system, while the modules are about 12% of what a homeowner pays.',
        kind: 'technical',
        // Technical rather than policy on purpose: these are benchmark
        // statistics revised on an annual cycle, not law that can change
        // overnight. The 365-day interval lines up with that cycle.
        checkedOn: '2026-09-15',
        source: 'US residential solar cost benchmarks, H1 2021 customer-acquisition share',
      },
      {
        id: 'us-installed-price-per-watt',
        statement:
          'A typical American installed residential price is around $3.00/W, roughly three times what the same hardware installs for in Australia.',
        kind: 'technical',
        checkedOn: '2026-09-15',
        source: 'US vs Australia installed residential price comparison',
      },
    ],
  },
]

/** All claims, flattened, each paired with the guide that carries it. */
export function allClaims(): { guide: GuideClaims; claim: Claim }[] {
  return GUIDE_CLAIMS.flatMap(guide => guide.claims.map(claim => ({ guide, claim })))
}

/** The claims for one guide, or an empty array — a guide need not have any. */
export function claimsFor(slug: string): Claim[] {
  return GUIDE_CLAIMS.find(g => g.slug === slug)?.claims ?? []
}
