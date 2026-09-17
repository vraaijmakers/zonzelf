import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  shopFor,
  applyTemplate,
  buyLink,
  anyPaid,
  relFor,
  type Shop,
} from '../affiliate'

// The registry is injected rather than read from the environment, because the
// real one is built from NEXT_PUBLIC_* at module load and a test that set those
// would be asserting on Next.js's build-time substitution instead of on the
// decision this module makes.
const SIGNED_UP: Shop[] = [
  { host: 'signaturesolar.com', name: 'Signature Solar', template: '{URL}?ref=zonzelf' },
  {
    host: 'sungoldpower.com',
    name: 'SunGoldPower',
    template: 'https://www.awin1.com/cread.php?awinmid=1&awinaffid=2&ued={URL_ENC}',
  },
]

/** The state of the world today: the shops exist, no programme is live. */
const NOT_SIGNED_UP: Shop[] = SIGNED_UP.map(s => ({ ...s, template: undefined }))

// Real rows, in the three shapes the catalogue actually contains.
const EG4_VIA_RESELLER = {
  source_url: 'https://eg4electronics.com/categories/batteries/eg4-wallmount-314ah-all-weather-battery/',
  retailer_url: 'https://signaturesolar.com/eg4-allweather-wallmount-battery-48v-314ah-16kwh/',
}
const SUNGOLD_OWN_STORE = {
  source_url: 'https://sungoldpower.com/products/48v-100ah-server-rack-lifepo4-lithium-battery-sg48100p',
  retailer_url: null,
}
const VICTRON_DATASHEET = {
  source_url: 'https://www.victronenergy.com/upload/documents/LiFePO4_12.8V100Ah_Smart_3D.PDF',
  retailer_url: null,
}

test('shopFor matches host, ignores www, and rejects lookalikes', () => {
  assert.equal(shopFor('https://signaturesolar.com/x', SIGNED_UP)?.name, 'Signature Solar')
  assert.equal(shopFor('https://www.signaturesolar.com/x', SIGNED_UP)?.name, 'Signature Solar')
  assert.equal(shopFor('https://shop.signaturesolar.com/x', SIGNED_UP)?.name, 'Signature Solar')
  // The dot in the suffix test is what stops this one matching.
  assert.equal(shopFor('https://notsignaturesolar.com/x', SIGNED_UP), null)
  assert.equal(shopFor('https://victronenergy.com/x', SIGNED_UP), null)
})

test('shopFor returns null rather than throwing on an unparseable URL', () => {
  assert.equal(shopFor('not a url', SIGNED_UP), null)
  assert.equal(shopFor('', SIGNED_UP), null)
})

test('applyTemplate fills both placeholder styles', () => {
  assert.equal(
    applyTemplate('{URL}?ref=zonzelf', 'https://shop.example/p/1'),
    'https://shop.example/p/1?ref=zonzelf',
  )
  assert.equal(
    applyTemplate('https://net.example/r?ued={URL_ENC}', 'https://shop.example/p?a=1&b=2'),
    'https://net.example/r?ued=https%3A%2F%2Fshop.example%2Fp%3Fa%3D1%26b%3D2',
  )
})

test('applyTemplate refuses a template that drops the destination', () => {
  // An Awin link pasted without its ued= tail. Still a valid URL, and it would
  // still pay — while sending every reader to the same landing page.
  assert.equal(applyTemplate('https://www.awin1.com/cread.php?awinmid=1&awinaffid=2', 'https://shop.example/p/1'), null)
})

test('a reseller URL wins over the manufacturer spec citation', () => {
  const link = buyLink(EG4_VIA_RESELLER, SIGNED_UP)
  assert.equal(link?.retailer, 'Signature Solar')
  assert.equal(link?.href, 'https://signaturesolar.com/eg4-allweather-wallmount-battery-48v-314ah-16kwh/?ref=zonzelf')
  assert.equal(link?.paid, true)
  // eg4electronics.com is a different page, so the card still offers the spec sheet.
  assert.equal(link?.isAlsoSpecSheet, false)
})

test("a manufacturer's own storefront is a shop, and is its own spec sheet", () => {
  const link = buyLink(SUNGOLD_OWN_STORE, SIGNED_UP)
  assert.equal(link?.retailer, 'SunGoldPower')
  assert.equal(link?.paid, true)
  assert.ok(link!.href.startsWith('https://www.awin1.com/cread.php?'))
  // One button, not two pointing at the same page.
  assert.equal(link?.isAlsoSpecSheet, true)
})

test('a row with no shop anywhere gets no buy link', () => {
  assert.equal(buyLink(VICTRON_DATASHEET, SIGNED_UP), null)
  assert.equal(
    buyLink({ source_url: 'https://eg4electronics.com/categories/batteries/lifepower4-48v-v2/' }, SIGNED_UP),
    null,
  )
})

test('an empty retailer_url falls through to source_url rather than blanking the link', () => {
  const link = buyLink({ ...SUNGOLD_OWN_STORE, retailer_url: '   ' }, SIGNED_UP)
  assert.equal(link?.retailer, 'SunGoldPower')
})

// The FTC property. Before any programme is signed up the links must still
// publish — a priced product the reader can go and buy is useful whether or not
// it pays — but nothing may claim to be paid.
test('with no programme signed up, links publish clean and unpaid', () => {
  const link = buyLink(EG4_VIA_RESELLER, NOT_SIGNED_UP)
  assert.equal(link?.href, EG4_VIA_RESELLER.retailer_url)
  assert.equal(link?.paid, false)
  assert.equal(relFor(link!), 'noopener noreferrer')
})

test('paid links carry rel=sponsored, unpaid ones must not', () => {
  assert.equal(relFor(buyLink(EG4_VIA_RESELLER, SIGNED_UP)!), 'sponsored noopener noreferrer')
  assert.equal(relFor(buyLink(EG4_VIA_RESELLER, NOT_SIGNED_UP)!), 'noopener noreferrer')
})

test('the disclosure shows for a shelf with any paid link, and for no other', () => {
  const paid = buyLink(EG4_VIA_RESELLER, SIGNED_UP)
  const unpaid = buyLink(EG4_VIA_RESELLER, NOT_SIGNED_UP)

  assert.equal(anyPaid([null, unpaid, paid]), true)
  assert.equal(anyPaid([null, unpaid, unpaid]), false)
  assert.equal(anyPaid([]), false)
  assert.equal(anyPaid([null, null]), false)
})

// A tag set to the empty string is the shape a half-finished .env produces.
// It must read as "not signed up", not as a template that rewrites nothing.
test('an empty template is treated as no programme', () => {
  const blank: Shop[] = [{ host: 'signaturesolar.com', name: 'Signature Solar', template: '' }]
  const link = buyLink(EG4_VIA_RESELLER, blank)
  assert.equal(link?.paid, false)
  assert.equal(link?.href, EG4_VIA_RESELLER.retailer_url)
})
