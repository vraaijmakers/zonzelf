import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseSungoldProduct,
  pickUnitVariant,
  capacitiesInTitle,
  chemistryFor,
  type ShopifyProduct,
} from '../sungoldpower-listing'

// Every fixture below is a real /products/<handle>.js response from
// sungoldpower.com on 2026-09-24, trimmed to the fields the parser reads. Nine
// of these ten parsed to nothing under the previous tags-based parser.

function product(over: Partial<ShopifyProduct>): ShopifyProduct {
  return { title: '', tags: [], featured_image: null, variants: [], ...over }
}

const SG48100P = product({
  title: '48V 100AH Server Rack LiFePO4 Lithium  Battery SG48100P UL1973  UL9540A',
  tags: ['48p', '48V', 'bfcm', 'rack', 'Rack-Mount', 'sale20', 'SG48100P', 'Standard', 'Up to 5kWh'],
  featured_image: '//cdn.shopify.com/s/files/1/0323/4090/2025/files/01_a77.jpg?v=1712718459',
  variants: [
    { title: '1 unit', sku: 'SG48100P', price: 109000 },
    { title: '2 units', sku: 'SG48100PX2', price: 217000 },
    { title: '4 units', sku: 'SG48100PX4', price: 432000 },
  ],
})

test('the size comes off the title now that the tags no longer carry it', () => {
  const result = parseSungoldProduct(SG48100P)
  assert.ok(result.ok)
  assert.equal(result.listing.voltage, 48)
  assert.equal(result.listing.capacity_ah, 100)
  assert.equal(result.listing.capacity_kwh, 4.8)
  // The tags on this product are '48p', '48V', 'bfcm', 'sale20', 'Up to 5kWh'
  // — a voltage and four merchandising buckets. There is no capacity in them.
  assert.equal(SG48100P.tags.some(t => /^\d+AH$/i.test(t)), false)
})

test('the price is the single NEW unit, not the cheapest variant', () => {
  // The old parser read the theme blob's "price", which is the minimum across
  // every variant. On the 12V 100Ah product that is the refurbished unit, and
  // that is the number published on the calculator since 2026-08-21.
  const twelveVolt = product({
    title: '12V 100AH LiFePO4 Deep Cycle Lithium Battery / Bluetooth /Self-heating / IP65',
    tags: ['100AH', '12V'],
    variants: [
      { title: '1 Unit [Brand New]', sku: 'LFP12-100A', price: 29500 },
      { title: '1 Unit [Refurbished]', sku: 'LFP12-100ARE', price: 19900 },
      { title: '2 Units', sku: 'LFP12-100Ax2', price: 58500 },
    ],
  })
  const result = parseSungoldProduct(twelveVolt)
  assert.ok(result.ok)
  assert.equal(result.listing.price_usd, 295)
  assert.equal(result.listing.sku, 'LFP12-100A')
})

test('multi-unit and second-hand variants are never the row', () => {
  assert.equal(pickUnitVariant([
    { title: '2 units', sku: 'X2', price: 1 },
    { title: '1 Unit [Open Box]', sku: 'OB', price: 2 },
    { title: '1 Unit [Brand New]', sku: 'NEW', price: 3 },
  ])?.sku, 'NEW')
  // Shopify's name for "this product has no variants".
  assert.equal(pickUnitVariant([{ title: 'Default Title', sku: 'SG48200T', price: 239000 }])?.sku, 'SG48200T')
  assert.equal(pickUnitVariant([{ title: '4 Unit', sku: 'X4', price: 1 }]), null)
})

test('one listing covering two capacities is refused, not guessed', () => {
  // How row #21 came to hold a 200Ah SKU with a 100Ah capacity and the 100Ah
  // price: both are on one URL, and the old parser took the first of each.
  const both = product({
    title: '12V 100Ah/ 200Ah LiFePo4 Deep Cycle Lithium Battery Bluetooth / Self-Heating / IP65',
    tags: ['12V'],
    variants: [
      { title: '200ah [Brand New] / 1 Unit', sku: 'LFP12-200A', price: 58900 },
      { title: '100ah / 1 Unit', sku: 'LFP12-100A', price: 29500 },
    ],
  })
  assert.deepEqual(capacitiesInTitle(both.title), [100, 200])
  const result = parseSungoldProduct(both)
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.reason, /row per capacity/)
})

test('a kWh figure alone does not produce a capacity', () => {
  // 5.12kWh ÷ the tagged 48V is 106.7Ah; the battery is 100Ah at its real
  // 51.2V. Dividing would publish a number that was never on the page.
  const wallMount = product({
    title: '5.12KWH Wall-mounted LiFePO4 Lithium Battery SG48100M UL1973',
    tags: ['100M', '48V', 'Up to 5kWh', 'Wall-Mount'],
    variants: [{ title: '1 Unit [Brand New]', sku: 'SG48100M', price: 113000 }],
  })
  const result = parseSungoldProduct(wallMount)
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.reason, /no Ah/)
})

test('51.2V settles the chemistry the page never states; 48V does not', () => {
  // 51.2V is 16 LFP cells at 3.2V and is named that way by nobody else. "48V"
  // is equally four 12V lead-acid blocks, so it settles nothing.
  assert.equal(chemistryFor('PowerMax 16.07kWh 51.2V 314AH Outdoor Energy Storage Battery', 51.2), 'lifepo4')
  assert.equal(chemistryFor('CoreX 5 Pro Server Rack 48V 100AH Residential Energy Storage Battery Pack', 48), null)
  assert.equal(chemistryFor('12.8V 100Ah Deep Cycle Battery', 12.8), 'lifepo4')
  // Stated in the title, whatever the voltage is called.
  assert.equal(chemistryFor('48V 100AH Server Rack LiFePO4 Battery', 48), 'lifepo4')
})

test('PowerMax is picked up; the two CoreX packs are still refused, with the reason', () => {
  const powerMax = product({
    title: 'PowerMax 16.07kWh 51.2V 314AH Outdoor Energy Storage Battery  UL1973 & UL9540A CEC Listed',
    tags: ['10–20kWh', '314a', '48V', 'Wall-Mount'],
    variants: [{ title: 'Default Title', sku: 'PowerMax 314 Outdoor', price: 299500 }],
  })
  const parsed = parseSungoldProduct(powerMax)
  assert.ok(parsed.ok)
  assert.equal(parsed.listing.voltage, 51.2)
  assert.equal(parsed.listing.capacity_ah, 314)
  assert.equal(parsed.listing.capacity_kwh, 16.08)
  assert.equal(parsed.listing.price_usd, 2995)

  const coreX = product({
    title: 'CoreX 5 Pro Server Rack 48V 100AH Residential Energy Storage Battery Pack Wi‑Fi & Bluetooth',
    tags: ['48V', 'CoreXpro', 'Rack-Mount'],
    variants: [{ title: '1 Unit [Brand New]', sku: 'CoreX 5 Pro', price: 115000 }],
  })
  const refused = parseSungoldProduct(coreX)
  assert.equal(refused.ok, false)
  assert.match(refused.ok ? '' : refused.reason, /states no chemistry/)
})

test('the title is trimmed but not tidied', () => {
  // "LiFePO4 Lithium  Battery" keeps its double space: the published rows have
  // it too, and collapsing it here would open a whitespace-only proposal on
  // every one of them.
  const result = parseSungoldProduct(SG48100P)
  assert.ok(result.ok)
  assert.match(result.listing.model, /Lithium {2}Battery/)
})
