/**
 * What a solar system costs, as data rather than sentences.
 *
 * WHY THIS IS A MODULE AND NOT PROSE IN A PAGE. Every figure here is the
 * fastest-decaying thing this site publishes, and the guide that renders it
 * exists because someone asked the right question: prices move week to week
 * under tariffs and freight, so what is written today is wrong next month.
 * The answer, worked out in src/lib/content-freshness.ts, is that the
 * volatility is not uniform — and the part of it that lives here is the part
 * that must be ARITHMETIC rather than assertion, so that a reader whose prices
 * differ can redo the sum instead of believing ours.
 *
 * So: no total is typed. bomTotal() adds the lines up, dollarsPerWatt()
 * divides, and the page prints what those return. A bill of materials whose
 * stated $/W disagrees with its own line items is the exact error this
 * prevents, and it is not hypothetical — the roadmap row that specified this
 * page quoted "roughly $1.05/W" for a basket that actually adds to $1.08/W.
 *
 * WHAT IS DELIBERATELY NOT HERE: anything that turns a reader's own inputs
 * into a payback or financing number. CLAUDE.md makes cost calculators a
 * non-goal, on the Winter-versus-Jeppesen reasoning in the legal posture — a
 * money output has no code to cite and no derivation ending in a standard.
 * These are published example figures a reader compares against, not a
 * calculator, and nothing here accepts user input.
 */

import { formatAsOf } from './battery-price'

/** Everything below was priced on this date. Rendered next to every total. */
export const COST_BASKET_PRICED_ON = '2026-09-15'

/**
 * "15 Sep 2026" — never 15/09/2026.
 *
 * Reuses formatAsOf rather than formatting inline, for the reason its own
 * header gives: this site has both US and EU readers, and a slashed date is
 * ambiguous to half of them. A first draft of this page rendered the basket
 * date as 15/09/2026 and the screenshot caught it.
 */
export function pricedOnLabel(iso: string = COST_BASKET_PRICED_ON): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : formatAsOf(d)
}

export interface BomLine {
  item: string
  /** How many, for the worked example. */
  qty: number
  /** USD each, as quoted on COST_BASKET_PRICED_ON. */
  unitUsd: number
  /**
   * Which rung of the DIY ladder this sits on.
   *
   * THREE, NOT TWO, and the middle one is the one people get wrong: doing the
   * work yourself deletes LABOUR, it does not delete PERMITS. A two-way
   * hardware/soft split quietly implies a DIY build skips inspection, which is
   * both false and the last thing this site should imply.
   */
  group: 'hardware' | 'permit' | 'labour'
  note?: string
}

/**
 * A 9 kW DIY build, as a basket rather than a quote.
 *
 * GROUPED BECAUSE THE GROUPING IS THE ARGUMENT. The DIY reader supplies the
 * labour and still pays the county, so the honest comparison is a ladder
 * rather than one number: parts, parts plus permits, and parts plus permits
 * plus paid help. Presenting only the last hides the thing worth knowing, and
 * presenting only the first pretends inspection is free.
 */
export const DIY_9KW_BOM: BomLine[] = [
  { item: '450 W modules', qty: 20, unitUsd: 130, group: 'hardware' },
  { item: '4-in-1 micro-inverters', qty: 5, unitUsd: 330, group: 'hardware' },
  { item: 'Racking, wire, connectors, hardware', qty: 1, unitUsd: 2000, group: 'hardware' },
  {
    item: 'Permits and inspection',
    qty: 1,
    unitUsd: 500,
    group: 'permit',
    note: 'Varies more by county than by anything about your system. Doing the work yourself does not delete this line.',
  },
  {
    item: 'Paid labour',
    qty: 1,
    unitUsd: 3000,
    group: 'labour',
    note: 'Zero if you do all of it yourself. This is the line DIY actually deletes.',
  },
]

/** Nameplate DC watts the basket above builds. */
export const DIY_9KW_WATTS = 20 * 450

/**
 * A typical US installed price, for the comparison. Not our quote — the number
 * a homeowner is given, which is the whole point of the contrast.
 */
export const US_INSTALLED_USD_PER_W = 3.0

export function lineTotal(line: BomLine): number {
  return line.qty * line.unitUsd
}

/** Sum of the basket, optionally only the named rungs of the ladder. */
export function bomTotal(lines: BomLine[], groups?: BomLine['group'][]): number {
  return lines
    .filter(l => (groups ? groups.includes(l.group) : true))
    .reduce((sum, l) => sum + lineTotal(l), 0)
}

/**
 * The ladder the page prints, cheapest rung first.
 *
 * Computed rather than typed, so a changed line item moves every rung at once
 * — the failure mode being avoided is a table whose rows are individually
 * right and whose totals were edited at three different times.
 */
export function costLadder(lines: BomLine[], watts: number) {
  const rung = (label: string, groups: BomLine['group'][], note: string) => {
    const total = bomTotal(lines, groups)
    return { label, total, perWatt: dollarsPerWatt(total, watts), note }
  }
  return [
    rung('Parts only', ['hardware'], 'What the hardware costs, before anyone touches it.'),
    rung('Parts and permits', ['hardware', 'permit'], 'What a full DIY build actually costs you.'),
    rung('Parts, permits and paid labour', ['hardware', 'permit', 'labour'], 'If you hire out the work you do not want to do.'),
  ]
}

/** Dollars per nameplate watt. Rounded to cents, the precision people quote. */
export function dollarsPerWatt(totalUsd: number, watts: number): number {
  if (!Number.isFinite(watts) || watts <= 0) return 0
  return Math.round((totalUsd / watts) * 100) / 100
}

/**
 * Where the money goes in an INSTALLED American system.
 *
 * The page's central claim rests on these: the hardware is not what makes a
 * US system cost three times an Australian one. Cited, dated, and registered
 * as a claim in guide-claims.ts — an annual benchmark is exactly the kind of
 * figure that is quietly superseded.
 */
export const INSTALLED_COST_SHARE = [
  {
    label: 'Customer acquisition',
    share: 0.23,
    note: 'H1 2021, about $0.75/W — more than the module cost that year.',
  },
  { label: 'Marketing, profit and labour together', share: 0.43, note: 'Of an American installed system.' },
  { label: 'The modules themselves', share: 0.12, note: 'Of what a homeowner pays.' },
]

/**
 * Section 232, proclaimed 6 August 2026, effective 12:01 a.m. ET 4 December 2026.
 *
 * THE FLOOR IS A MINIMUM IMPORT PRICE, not a duty: a module entering below it
 * is treated as if it were sold at it. The 15% ad valorem duty is a separate
 * instrument in the same proclamation, and this module deliberately does NOT
 * model the two stacking, because how they combine depends on entered value
 * and is not something we have read a ruling on. Asserting a combined number
 * we cannot derive is the mistake the whole freshness apparatus exists to
 * stop; showing the floor effect alone, and naming the duty separately, is
 * what the sources actually support.
 */
export const SECTION_232 = {
  proclaimedOn: '2026-08-06',
  effectiveOn: '2026-12-04',
  moduleFloorUsdPerW: 0.38,
  cellFloorUsdPerW: 0.22,
  adValoremRate: 0.15,
  /** Median transacted module price when this was checked. Decays fastest of all. */
  medianModuleUsdPerW: 0.271,
}

/** How far the floor sits above a market price, as a fraction. */
export function floorUpliftFraction(marketUsdPerW: number, floorUsdPerW: number): number {
  if (!Number.isFinite(marketUsdPerW) || marketUsdPerW <= 0) return 0
  return floorUsdPerW / marketUsdPerW - 1
}

/**
 * The same increase measured against a whole installed system.
 *
 * THIS IS THE NUMBER THE PAGE EXISTS FOR. The trade press reports the floor as
 * a rounding error, and against a $27,000 installed job it is. The reader here
 * buys bare pallets, where there is no installed-system denominator to dilute
 * it — so the identical policy is a small number for the homeowner and a large
 * one for them. Returns the fraction of total system cost the increase adds.
 */
export function upliftAgainstSystem(
  watts: number,
  marketUsdPerW: number,
  floorUsdPerW: number,
  systemUsdPerW: number,
): number {
  if (watts <= 0 || systemUsdPerW <= 0) return 0
  const extraPerWatt = Math.max(0, floorUsdPerW - marketUsdPerW)
  return extraPerWatt / systemUsdPerW
}

/**
 * 26 U.S.C. 25D, the 30% residential clean energy credit — terminated.
 *
 * The trap is the SECOND sentence, not the first. 25D treats an expenditure as
 * made when the original installation is COMPLETED, so paying a deposit in
 * 2025 for a system finished in 2026 earns nothing. Anyone who bought early
 * specifically to catch the credit is the person most likely to get this wrong.
 */
export const CREDIT_25D = {
  statute: '26 U.S.C. 25D',
  repealedBy: 'P.L. 119-21 section 70506',
  lastQualifyingExpenditure: '2025-12-31',
  rate: 0.3,
}

/**
 * US dollars, no cents — every figure on this page is an estimate, not an invoice.
 *
 * WHICH DOLLARS, and why the page says so out loud rather than leaving "$" to
 * stand on its own. This site formats dates by hand (formatAsOf) because it
 * has both US and EU readers and 15/09 is ambiguous to half of them; a bare
 * "$" is the same problem, and it is sharper here because the page's headline
 * comparison is against AUSTRALIA, which also writes "$". The currency is
 * stated once at the top of the guide and again in every money column header.
 *
 * It is USD because the subject is: a Section 232 proclamation and a repealed
 * federal credit have no euro denomination, and the audience is US-first with
 * NEC 310.16 as the governing code. Converting these would produce a page
 * about American tariff law priced in a currency no American supplier quotes.
 */
export function usd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}
