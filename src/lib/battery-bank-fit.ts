/**
 * What one battery model actually delivers against a bank target, and what its
 * storage costs per kWh.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * /calculators/battery shows `ceil(bankKwh / capacity_kwh)` units, and since
 * 2026-09-15 multiplies that count by a scraped price into a bank total sitting
 * next to an affiliate buy link. The count is right and the total is right.
 * Read across the shelf they are still misleading, because the card never says
 * how much battery the count delivers.
 *
 * Worked from the three rows carrying a retailer link on 2026-09-16, against a
 * 15 kWh target:
 *
 *   Discover AES   5.12 kWh   3 units   $5,050   ->  15.4 kWh
 *   EG4 280Ah     14.34 kWh   2 units   $6,250   ->  28.7 kWh
 *   EG4 314Ah     16.08 kWh   1 unit    $3,750   ->  16.1 kWh
 *
 * A visitor reads that as "the 280Ah costs $2,500 more than the bigger 314Ah".
 * It does not. It is the cheaper battery per kWh of the three, but 15 / 14.34
 * is 1.05, so `ceil` buys a second pack and 13 kWh nobody asked for. Move the
 * target to 20 kWh and the ordering inverts — the 280Ah becomes the cheapest
 * total and the 314Ah the dearest — with nothing about either battery having
 * changed. The ranking is a property of where `ceil` lands, not of the
 * hardware, and the card gave no way to see that.
 *
 * THERE IS NO WASTED PACK TO WARN ABOUT. `ceil` is minimal by construction, so
 * `units - 1` never covers the target and no count on the shelf contains a pack
 * that could simply be dropped. The overshoot is granularity, not error. It
 * cannot be corrected by choosing better — only compared.
 *
 * WHICH IS WHY THIS MODULE HAS NO THRESHOLD AND RAISES NO ALARM. The obvious
 * design is an amber note above some overshoot percentage, and that number
 * cannot be justified: buildScenarios() steps from "through the night" to "one
 * sunless day" by roughly 2x at neutral weather, so which scenario the visitor
 * picks moves the target far further than rounding up to a whole pack ever
 * does. Rounding is not the dominant uncertainty on this page. Flagging it as
 * though it were would point the reader at the wrong number. What is missing is
 * not a warning, it is a comparable figure.
 *
 * NOR DOES IT PICK A WINNER. Sorting the shelf by value, or badging one card
 * "best value", would put the site's thumb on a row that pays a commission —
 * the shape src/lib/affiliate.ts exists to keep honest. Publish the figures on
 * every card and let the reader draw the conclusion: differentiator #1.
 *
 * TWO NUMBERS, DELIBERATELY NOT BLENDED. `costPerKwh` divides by what you buy,
 * not by what you asked for, so it is a property of the row alone — independent
 * of the target, and therefore unable to disagree with the rounded target the
 * card header prints. `overshootPct` carries the granularity separately. A
 * single target-denominated "$/kWh you asked for" would fold both into one
 * figure that is neither, and would drift against the header's rounded kWh.
 *
 * Pure on purpose, like battery-price.ts and scrape-health.ts: the arithmetic
 * is the thing worth testing, and it must not need a database to exercise.
 */

/** Two decimals, without the float noise of `3 * 5.12`. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface BankFit {
  /** Whole packs needed to cover the target. Minimal — see the header. */
  units: number
  /** What those packs actually store, kWh. Always >= the target. */
  deliveredKwh: number
  /** Storage beyond the target, kWh. Zero only when the target divides exactly. */
  overshootKwh: number
  /**
   * `overshootKwh` as a whole percentage of the target. Rounded here rather
   * than in the page so the figure the visitor reads is the figure the tests
   * assert.
   */
  overshootPct: number
  /** `units` x the unit price, or null when there is no price to vouch for. */
  totalPrice: number | null
  /**
   * Dollars per kWh of storage bought — unit price over unit capacity. The
   * honest hardware comparison across the shelf, and the one figure here that
   * does not depend on the target at all.
   */
  costPerKwh: number | null
}

/**
 * Fits one model to a bank target.
 *
 * Returns null when there is nothing to fit: a target of zero (the visitor has
 * entered no load yet) or a non-positive capacity, which would be a bad row
 * rather than a battery. The caller renders the card without these figures in
 * that case, exactly as it did before this module existed — a missing spec must
 * not blank a published row.
 *
 * `unitPrice` is what priceDisplay() decided the site may still repeat, not the
 * raw column: a price too old to show must not reappear here as a bank total.
 */
export function bankFit(
  targetKwh: number,
  unitKwh: number,
  unitPrice: number | null = null,
): BankFit | null {
  if (!Number.isFinite(targetKwh) || targetKwh <= 0) return null
  if (!Number.isFinite(unitKwh) || unitKwh <= 0) return null

  const units = Math.ceil(targetKwh / unitKwh)
  const deliveredKwh = round2(units * unitKwh)
  const overshootKwh = round2(Math.max(0, deliveredKwh - targetKwh))

  const priced = unitPrice != null && Number.isFinite(unitPrice) && unitPrice > 0

  return {
    units,
    deliveredKwh,
    overshootKwh,
    overshootPct: Math.round((overshootKwh / targetKwh) * 100),
    totalPrice: priced ? round2(units * unitPrice!) : null,
    costPerKwh: priced ? Math.round(unitPrice! / unitKwh) : null,
  }
}
