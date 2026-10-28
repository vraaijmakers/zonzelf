// Sun Gold Power's own Shopify store, read into catalogue listings.
//
// WHY THIS SHOP. It is the manufacturer of three products already verified and
// published (SG550WM, SPH8048P, SPH10048P) that had no buy link, because
// Signature Solar does not sell them — and it runs its own affiliate programme
// (6%, sungoldpower.com/pages/affiliate-program, read 2026-10-01).
//
// WHERE THE DATA IS. Shopify serves every collection as JSON
// (/collections/<handle>/products.json), with each product's variants, SKUs,
// prices and stock. One request per collection, no product pages.
//
// THE SKU IS THE KEY, and it carries two things at once (2026-10-01):
//   SG550WMx2 / SG550WMx32     the SG550WM, in a pack of 2 / a pallet of 32
//   SPH8048P                    one SPH8048P
//   SPH8048Px2 / SPH6548P*2     two units, sold as a parallel pair
//   SPH8048P+2*SG48100P         a KIT — inverter plus batteries — skipped
//   LFP4K12V240VSPRE / ...OB    refurbished / open box — skipped: a used-unit
//                               price would undercut the new one as "cheapest"
// So the part number is the SKU with its pack suffix removed, and the listing's
// pack_qty is the suffix. That is what lets the SG550WMx32 pallet land on the
// already-verified SG550WM model rather than creating a new one.
//
// Pure, like bigcommerce-product.ts: the scraper fetches, this decides.

export type ShopifyVariant = {
  id: number
  sku: string | null
  title: string
  price: string
  available: boolean
}

export type ShopifyProduct = {
  id: number
  title: string
  handle: string
  vendor?: string
  product_type?: string
  body_html?: string | null
  images?: { src: string }[]
  variants: ShopifyVariant[]
}

export type SkuParse =
  | { ok: true; mpn: string; packQty: number }
  | { ok: false; reason: string }

export function parseSku(sku: string | null | undefined): SkuParse {
  const s = (sku ?? '').trim()
  if (!s) return { ok: false, reason: 'no SKU' }
  if (s.includes('+') || /^\d+\s*X/i.test(s)) return { ok: false, reason: 'a kit with other products in it' }
  // Refurbished / open-box suffixes. Matched only after a model-looking body,
  // so a part number that merely ends in RE or OB is not caught.
  if (/[0-9A-Z](RE|OB)$/.test(s) && /\d/.test(s)) return { ok: false, reason: 'refurbished or open box' }

  const pack = s.match(/^(.+?)\s*[x*]\s*(\d{1,3})$/i)
  if (pack) {
    const qty = Number(pack[2])
    if (qty < 1) return { ok: false, reason: 'pack of zero' }
    return { ok: true, mpn: pack[1].trim(), packQty: qty }
  }
  return { ok: true, mpn: s, packQty: 1 }
}

/** The spec sheet linked from the product description, when there is one. */
export function specSheetIn(bodyHtml: string | null | undefined): string | null {
  const m = (bodyHtml ?? '').match(/https:\/\/[^"'\s<>]+?\.pdf(?:\?[^"'\s<>]*)?/i)
  return m ? m[0].replace(/&amp;/g, '&') : null
}

/**
 * Model name for a NEW model. A page titled "370W/ 415W/ 500W Mono Black …"
 * or "6000W DC 24V/ 48V …" sells several products; the part number says which,
 * so it leads the name and a leading wattage list is dropped. Without this,
 * three different panels were created with one identical name (2026-10-01).
 */
export function modelName(title: string, mpn: string): string {
  const t = title.trim()
  // Idempotent: a name that already leads with its part number is final.
  if (t.toUpperCase().startsWith(`${mpn.toUpperCase()} `)) return t
  if (!/\d\s*[A-Za-z]*\s*\/\s*\d/.test(t)) return t
  const unit = '(?:Watts?|KW|W)'
  const rest = t.replace(new RegExp(`^[\\d.]+\\s*${unit}?(?:\\s*/\\s*[\\d.]+\\s*${unit}?)*\\s+`, 'i'), '')
  return `${mpn} ${rest}`.trim()
}

/** "450/ 550 Watt Monocrystalline PERC Solar Panel" covers two wattages; the SKU says which. */
export function wattsFromMpn(mpn: string): number | null {
  const m = mpn.match(/(?:^|[^0-9])(\d{3})(?:W|-)/i)
  return m ? Number(m[1]) : null
}

export type ShopifyListing = {
  mpn: string
  packQty: number
  variantId: number
  title: string
  priceUsd: number | null
  url: string
  imageUrl: string | null
  specSheetUrl: string | null
}

/**
 * Every new, in-stock, non-kit variant of a product, as listings.
 * `skipped` says why the rest were left out, for the run log.
 */
export function shopifyListings(
  product: ShopifyProduct,
  site: string,
): { listings: ShopifyListing[]; skipped: string[] } {
  const listings: ShopifyListing[] = []
  const skipped: string[] = []
  const url = `${site}/products/${product.handle}`
  for (const v of product.variants) {
    const sku = parseSku(v.sku)
    if (!sku.ok) {
      skipped.push(`${v.sku ?? '(no sku)'}: ${sku.reason}`)
      continue
    }
    if (!v.available) {
      skipped.push(`${v.sku}: out of stock`)
      continue
    }
    const price = Number(v.price)
    listings.push({
      mpn: sku.mpn,
      packQty: sku.packQty,
      variantId: v.id,
      title: v.title === 'Default Title' ? product.title : `${product.title} — ${v.title}`,
      priceUsd: Number.isFinite(price) && price > 0 ? price : null,
      url: `${url}?variant=${v.id}`,
      imageUrl: product.images?.[0]?.src ?? null,
      specSheetUrl: specSheetIn(product.body_html),
    })
  }
  return { listings, skipped }
}
