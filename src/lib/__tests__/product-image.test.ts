import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractOgImage, normalizeImageUrl } from '../product-image'

// Each fixture below is the real tag shape from that vendor's live HTML on
// 2026-09-24, trimmed to the meta element. They differ enough that a single
// "assume og:image looks like this" regex would have missed two of the four.

test('EG4 — self-closing tag, property before content', () => {
  const html =
    '<meta property="og:image" content="https://eg4electronics.com/wp-content/uploads/2025/09/EG4-WallMount-All-Weather-Front.webp" />'
  assert.equal(
    extractOgImage(html, 'https://eg4electronics.com/categories/batteries/eg4-wallmount-all-weather-battery/'),
    'https://eg4electronics.com/wp-content/uploads/2025/09/EG4-WallMount-All-Weather-Front.webp',
  )
})

test('SunGoldPower — Shopify, and the ?v= cache-buster is dropped', () => {
  // Shopify bumps ?v=<timestamp> whenever the image is re-saved, identical
  // bytes or not. Kept, it would look like a change to review every week.
  const html =
    '<meta property="og:image" content="https://sungoldpower.com/cdn/shop/files/01_a77.jpg?v=1712718459">'
  assert.equal(
    extractOgImage(html, 'https://sungoldpower.com/products/48v-100ah-server-rack'),
    'https://sungoldpower.com/cdn/shop/files/01_a77.jpg',
  )
})

test('A1 SolarStore — no space before content=', () => {
  const html = '<meta property="og:image"content="https://a1solarstore.com/images/detailed/101/c2ab.png" />'
  assert.equal(
    extractOgImage(html, 'https://a1solarstore.com/discover-energy-48-48-5120-h.html'),
    'https://a1solarstore.com/images/detailed/101/c2ab.png',
  )
})

test('BigCommerce ?c=1 survives — it is a format flag, not a version', () => {
  const html =
    '<meta property="og:image" content="https://cdn11.bigcommerce.com/s-bi8/products/3177/images/3309/00b__35990.1761213416.386.513.jpg?c=1" />'
  assert.equal(
    extractOgImage(html, 'https://signaturesolar.com/eg4-wallmount-all-weather/'),
    'https://cdn11.bigcommerce.com/s-bi8/products/3177/images/3309/00b__35990.1761213416.386.513.jpg?c=1',
  )
})

test('twitter:image is the fallback when og:image is absent', () => {
  const html = '<meta name="twitter:image" content="https://example.com/b.jpg">'
  assert.equal(extractOgImage(html, 'https://example.com/p'), 'https://example.com/b.jpg')
})

test('relative and protocol-relative sources resolve against the page', () => {
  assert.equal(
    extractOgImage('<meta property="og:image" content="/img/b.png">', 'https://example.com/products/x'),
    'https://example.com/img/b.png',
  )
  assert.equal(
    extractOgImage('<meta property="og:image" content="//cdn.example.com/b.png">', 'https://example.com/p'),
    'https://cdn.example.com/b.png',
  )
})

test('a page with no image, or a junk value, yields null rather than a broken src', () => {
  assert.equal(extractOgImage('<html><body>no meta here</body></html>', 'https://example.com/p'), null)
  assert.equal(extractOgImage('<meta property="og:image" content="">', 'https://example.com/p'), null)
  // data: and javascript: are not things to hotlink into an admin page.
  assert.equal(
    extractOgImage('<meta property="og:image" content="javascript:alert(1)">', 'https://example.com/p'),
    null,
  )
})

test('normalizeImageUrl leaves a URL it cannot parse alone', () => {
  assert.equal(normalizeImageUrl('not a url'), 'not a url')
})
