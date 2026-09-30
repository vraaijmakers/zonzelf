// What a scrape may do with a shop's price for a catalogue listing.
//
// A DELIBERATE DEPARTURE from battery_models, which routes every price change
// on a published row through a proposal an admin applies. That was right for
// twenty-odd batteries. A panel catalogue is hundreds of listings whose prices
// move weekly, and a queue with a proposal per listing per week is the queue
// nobody reads — which is the failure battery_model_revisions was itself
// designed around. The price is also the one field with its own freshness
// machinery: price_scraped_at dates it and src/lib/battery-price.ts expires it.
//
// So a price is written in place, dated, when it moves by an ordinary amount.
// What still needs a human is the move a parser bug looks like: a published
// listing whose price jumps or collapses. That is held beside the live one and
// the live price stays up until an admin decides. Unpublished models are not
// live, so nothing on them is held — the same rule the battery gate uses.

/** A move beyond this fraction, either way, on a published model is held. */
export const PRICE_HOLD_THRESHOLD = 0.3

export type PriceDecision =
  | { action: 'write'; price_usd: number }
  | { action: 'confirm' }
  | { action: 'hold'; price_usd: number; change: number }
  | { action: 'none' }

export function decideListingPrice(
  current: number | null,
  scraped: number | null,
  isPublished: boolean,
): PriceDecision {
  // Silence is not a correction: a page that stopped showing a price has not
  // withdrawn it. Stale prices age out through price_scraped_at instead.
  if (scraped === null) return { action: 'none' }
  if (current === scraped) return { action: 'confirm' }
  if (current === null || current === 0 || !isPublished) return { action: 'write', price_usd: scraped }

  const change = (scraped - current) / current
  if (Math.abs(change) > PRICE_HOLD_THRESHOLD) return { action: 'hold', price_usd: scraped, change }
  return { action: 'write', price_usd: scraped }
}
