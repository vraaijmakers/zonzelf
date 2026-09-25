/**
 * Pulling a product photo out of a vendor page, and keeping the URL stable
 * enough to store.
 *
 * Lives in src/lib rather than scripts/ for the same reason battery-review.ts
 * does: `npm test` runs against src/lib/__tests__, and the parsing rules here
 * are exactly the kind that break silently when a vendor changes their theme.
 * No network, no cheerio — a regex over markup the scrapers have already
 * fetched, so every scraper can use it whether it parses with cheerio or not.
 */

/**
 * The page's own og:image, absolutised against the page URL.
 *
 * og:image rather than the largest <img> on the page: it is the one image a
 * vendor deliberately chose to represent the product, it survives theme
 * changes that reshuffle the gallery markup, and all four scraped sites set it
 * (verified against live HTML on 2026-09-24 — EG4, SunGoldPower, Signature
 * Solar, A1 SolarStore). Falls back to twitter:image, which BigCommerce and
 * Shopify both emit alongside it.
 *
 * Returns null when the page states no image. Null never clears a stored one
 * (see syncImageUrl in scripts/lib/scrape-common.ts) — a theme that stopped
 * emitting the tag is not the vendor withdrawing the photo.
 */
export function extractOgImage(html: string, pageUrl: string): string | null {
  for (const property of ['og:image', 'twitter:image']) {
    // Attribute order varies by platform — BigCommerce writes content= first
    // on some tags, and A1 SolarStore emits no space before content= at all —
    // so match the tag, then the attribute, rather than one fixed shape.
    const tag = new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${property}["'][^>]*>`, 'i').exec(html)
    if (!tag) continue
    const content = /content\s*=\s*["']([^"']+)["']/i.exec(tag[0])
    if (!content) continue
    const absolute = toAbsoluteImageUrl(content[1].trim(), pageUrl)
    if (absolute) return absolute
  }
  return null
}

/**
 * An image reference from a page, as a storable absolute URL — or null if it
 * is not one. Exported because a scraper reading a platform API rather than
 * markup (scrape-sungoldpower.ts, which gets `featured_image` from Shopify's
 * product JSON) needs the same resolving and the same cache-buster stripping
 * without any meta tag to extract it from.
 */
export function toAbsoluteImageUrl(value: string, pageUrl: string): string | null {
  if (!value) return null
  try {
    // Handles absolute URLs, protocol-relative //cdn/… and site-root /img/….
    const url = new URL(value, pageUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return normalizeImageUrl(url.toString())
  } catch {
    return null
  }
}

/**
 * Cache-busting query parameters, dropped.
 *
 * Shopify appends `?v=<unix timestamp>` to every CDN asset and bumps it
 * whenever the image is re-saved — even when the photo is identical. Stored
 * verbatim, that is a column that changes on its own schedule for no reason a
 * reviewer would recognise. The bare URL serves the same bytes (checked
 * against sungoldpower.com's CDN: 200, image/jpeg, same file).
 *
 * BigCommerce's `?c=1` is a format flag, not a version, and the version it
 * does carry is in the filename — so only the known cache-busting keys are
 * stripped, not the whole query string.
 */
const CACHE_BUSTING_PARAMS = ['v', '_', 't', 'timestamp']

export function normalizeImageUrl(value: string): string {
  try {
    const url = new URL(value)
    for (const param of CACHE_BUSTING_PARAMS) url.searchParams.delete(param)
    return url.toString()
  } catch {
    return value
  }
}
