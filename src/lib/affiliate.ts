/**
 * What the site publishes when a card sends a reader to a shop, and whether
 * that link pays ZonZelf.
 *
 * Affiliate is the primary revenue line (CLAUDE.md, Monetization), and until
 * now none of it reached a visitor: /calculators/battery linked `source_url`,
 * the manufacturer's spec citation, and `retailer_url` — the field the
 * scrapers fill and the only monetisable one — was rendered nowhere outside
 * /admin/batteries.
 *
 * THE FTC PROPERTY THIS FILE EXISTS TO GUARANTEE. The rule is that a paid link
 * carries a disclosure that is clear and conspicuous, near the link, before
 * the click. The way that rule normally breaks is that the link and the
 * disclosure are two separate edits and only one of them ships. So `paid` here
 * is not a flag anyone remembers to set: it is true exactly when a programme
 * template actually rewrote the URL, and the UI derives the disclosure from
 * the same value. A link cannot become paid without its disclosure appearing,
 * because they read the same boolean.
 *
 * WHY THE TEMPLATE COMES FROM THE ENVIRONMENT AND NOT FROM A CONSTANT HERE.
 * Every network hands out a different link shape — an in-house programme tends
 * to append a parameter to the merchant's own URL, while a network like Awin
 * wraps it in a redirect on its domain — and the exact shape is only knowable
 * from the dashboard after the programme accepts you. Guessing `?ref=zonzelf`
 * and committing it would
 * be the same mistake the INVERTER_PRESETS admission gate exists to prevent:
 * a number nobody read, carrying the site's authority. So the repo holds the
 * mechanism and the environment holds the shape. No programme is signed up as
 * of 2026-09-15, every template below is therefore undefined, and every link
 * renders clean and undisclosed — which is the honest state, because nothing
 * pays yet.
 *
 * Pure on purpose, like battery-price.ts and scrape-health.ts: the decision is
 * the thing worth testing, and it must not need a database or a browser.
 */

/** A shop a reader can be sent to, and the programme that pays for it. */
export type Shop = {
  /**
   * Registrable hostname, no `www.`. Matched against the URL's host exactly or
   * as a suffix, so `shop.example.com` matches `example.com` — but
   * `notexample.com` does not, which is why the suffix test checks for the dot.
   */
  host: string
  /**
   * How the shop is named to a reader. Kept identical to the string the
   * scrapers write into `battery_models.retailer` (scrape-signaturesolar.ts,
   * scrape-a1solarstore.ts) so a card can be labelled from either side.
   */
  name: string
  /**
   * The link shape this programme issued, from the environment. Two
   * placeholders, at least one of which must appear:
   *
   *   {URL}      the product URL, inserted as-is
   *   {URL_ENC}  the product URL, percent-encoded for use inside a query value
   *
   * Examples of the two shapes in the wild — both are illustrations, neither
   * is a real credential:
   *
   *   {URL}?ref=zonzelf
   *   https://www.awin1.com/cread.php?awinmid=MID&awinaffid=AFFID&ued={URL_ENC}
   *
   * Undefined means "no programme yet": links to this shop publish untagged.
   */
  template: string | undefined
}

/**
 * NEXT_PUBLIC_ because /calculators/battery is a client component and the link
 * is built in the browser. That is not a leak — an affiliate tag travels in
 * the outbound URL by design and is visible to anyone who hovers a link. It is
 * not a secret, and rule 9's "never expose the service-role key" is a
 * different concern.
 *
 * These reads must stay literal `process.env.NEXT_PUBLIC_X` property accesses.
 * Next.js inlines them at build time by textual substitution, so a computed
 * lookup like `process.env[key]` would silently be undefined in the browser —
 * which would look exactly like "no programme signed up yet" and would be
 * nearly impossible to spot. Adding a tag therefore needs a rebuild, not just
 * a restart.
 */
export const SHOPS: Shop[] = [
  {
    host: 'signaturesolar.com',
    name: 'Signature Solar',
    template: process.env.NEXT_PUBLIC_AFFILIATE_SIGNATURE_SOLAR,
  },
  {
    // The manufacturer's own storefront, so for these rows `source_url` is
    // both the spec citation and the shop — see buyLink() below, which is the
    // reason it considers source_url at all.
    host: 'sungoldpower.com',
    name: 'SunGoldPower',
    template: process.env.NEXT_PUBLIC_AFFILIATE_SUNGOLDPOWER,
  },
  {
    host: 'a1solarstore.com',
    name: 'A1 SolarStore',
    template: process.env.NEXT_PUBLIC_AFFILIATE_A1SOLARSTORE,
  },
]

/** The shop a URL points at, or null if it is not a shop we know. */
export function shopFor(url: string, shops: Shop[] = SHOPS): Shop | null {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    // An unparseable source_url is a data problem for the scraper to fix, not
    // a reason to throw inside a render.
    return null
  }
  return shops.find(s => host === s.host || host.endsWith(`.${s.host}`)) ?? null
}

/**
 * Substitutes a product URL into a programme template.
 *
 * Returns null when the template names neither placeholder. That is not
 * pedantry: an Awin template pasted without its `ued=` tail is still a valid
 * URL, and using it would send every reader on the site to the same generic
 * landing page instead of the battery they clicked — a failure that still
 * earns the network a click and so would never look broken from here.
 */
export function applyTemplate(template: string, url: string): string | null {
  if (!template.includes('{URL}') && !template.includes('{URL_ENC}')) return null
  return template
    .replaceAll('{URL_ENC}', encodeURIComponent(url))
    .replaceAll('{URL}', url)
}

/** The outbound link for one battery card. */
export type BuyLink = {
  /** Where the reader actually goes. Tagged only when `paid` is true. */
  href: string
  /** The shop's name, for the button label. */
  retailer: string
  /**
   * True when a programme template rewrote the URL — i.e. this click can earn
   * money. Drives both the disclosure and `rel="sponsored"`. See the header.
   */
  paid: boolean
  /**
   * True when the shop page and the spec citation are the same page, so the
   * card should offer one button rather than two pointing at one URL. The
   * SunGoldPower rows are the case that needs this.
   */
  isAlsoSpecSheet: boolean
}

/**
 * Decides what one battery card links to.
 *
 * `retailer_url` wins when the scrapers captured one: it is the page the
 * reseller sells on, and `source_url` for those rows is a manufacturer
 * datasheet with nothing to buy. When there is no reseller, `source_url` is
 * still worth checking, because a manufacturer that runs its own storefront
 * (SunGoldPower) publishes specs and a price on one page — those seven rows
 * are the largest priced block in the catalogue and would otherwise carry no
 * link at all.
 *
 * Returns null when neither URL is a shop we know: Victron's rows cite a PDF
 * on victronenergy.com, which sells nothing and runs no programme, and EG4's
 * unpriced rows cite eg4electronics.com, which is a manufacturer site. Those
 * cards keep their spec-sheet link and nothing else, which is correct — they
 * are editorial.
 */
export function buyLink(
  row: { retailer_url?: string | null; source_url: string },
  shops: Shop[] = SHOPS,
): BuyLink | null {
  const retailerUrl = row.retailer_url?.trim() || null
  const target = retailerUrl ?? row.source_url
  const shop = shopFor(target, shops)
  if (!shop) return null

  const tagged = shop.template ? applyTemplate(shop.template, target) : null

  return {
    href: tagged ?? target,
    retailer: shop.name,
    paid: tagged !== null,
    isAlsoSpecSheet: target === row.source_url,
  }
}

/**
 * Does anything on this shelf pay us? The disclosure renders on exactly this
 * condition — never on a shelf of untagged links, because claiming to earn a
 * commission we do not earn is its own kind of dishonesty, and never absent
 * from a shelf that does.
 */
export function anyPaid(links: (BuyLink | null)[]): boolean {
  return links.some(l => l?.paid === true)
}

/**
 * `rel` for an outbound product link.
 *
 * `sponsored` is the value search engines define for a paid link and is the
 * machine-readable half of the same disclosure the reader sees. It belongs on
 * paid links only — marking an unpaid citation as sponsored is as wrong as
 * leaving a paid one unmarked.
 */
export function relFor(link: BuyLink): string {
  return link.paid ? 'sponsored noopener noreferrer' : 'noopener noreferrer'
}
