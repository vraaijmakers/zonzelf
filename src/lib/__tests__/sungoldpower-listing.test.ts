import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseSungoldProduct,
  pickUnitVariant,
  capacitiesInTitle,
  capacityFromEnergy,
  chemistryFor,
  oneRowPerSku,
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
    { id: 7025, title: '1 unit', sku: 'SG48100P', price: 109000 },
    { id: 7476, title: '2 units', sku: 'SG48100PX2', price: 217000 },
    { id: 7184, title: '4 units', sku: 'SG48100PX4', price: 432000 },
  ],
})

test('the size comes off the title now that the tags no longer carry it', () => {
  const result = parseSungoldProduct(SG48100P)
  assert.ok(result.ok)
  const listing = result.listings[0]
  assert.equal(result.listings.length, 1)
  assert.equal(listing.voltage, 48)
  assert.equal(listing.capacity_ah, 100)
  assert.equal(listing.capacity_kwh, 4.8)
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
      { id: 7203, title: '1 Unit [Brand New]', sku: 'LFP12-100A', price: 29500 },
      { id: 7427, title: '1 Unit [Refurbished]', sku: 'LFP12-100ARE', price: 19900 },
      { id: 7122, title: '2 Units', sku: 'LFP12-100Ax2', price: 58500 },
    ],
  })
  const result = parseSungoldProduct(twelveVolt)
  assert.ok(result.ok)
  const listing = result.listings[0]
  assert.equal(result.listings.length, 1)
  assert.equal(listing.price_usd, 295)
  assert.equal(listing.sku, 'LFP12-100A')
})

test('multi-unit and second-hand variants are never the row', () => {
  assert.equal(pickUnitVariant([
    { id: 7476, title: '2 units', sku: 'X2', price: 1 },
    { id: 7849, title: '1 Unit [Open Box]', sku: 'OB', price: 2 },
    { id: 7203, title: '1 Unit [Brand New]', sku: 'NEW', price: 3 },
  ])?.sku, 'NEW')
  // Shopify's name for "this product has no variants".
  assert.equal(pickUnitVariant([{ id: 7352, title: 'Default Title', sku: 'SG48200T', price: 239000 }])?.sku, 'SG48200T')
  assert.equal(pickUnitVariant([{ id: 7131, title: '4 Unit', sku: 'X4', price: 1 }]), null)
})

test('one listing covering two capacities becomes two rows, each with its own URL', () => {
  // Row #21 is what taking the first of each produced: the 100Ah capacity and
  // price with the 200Ah SKU bolted on. Shopify's ?variant= URLs are the only
  // per-battery URL this page has, and source_url has to be unique.
  const both = product({
    title: '12V 100Ah/ 200Ah LiFePo4 Deep Cycle Lithium Battery Bluetooth / Self-Heating / IP65',
    tags: ['12V'],
    variants: [
      { id: 43342854193289, title: '200ah [Brand New] / 1 Unit', sku: 'LFP12-200A', price: 58900 },
      { id: 43342854226057, title: '200ah [Brand New] / 2 Units', sku: 'LFP12-200Ax2', price: 117000 },
      { id: 47129865486473, title: '200ah [Refurbished] / 1 Unit', sku: 'LFP12-200ARE', price: 29900 },
      { id: 42687934070921, title: '100ah / 1 Unit', sku: 'LFP12-100A', price: 29500 },
      { id: 42687934103689, title: '100ah / 2 Units', sku: 'LFP12-100Ax2', price: 58500 },
    ],
  })
  assert.deepEqual(capacitiesInTitle(both.title), [100, 200])

  const result = parseSungoldProduct(both)
  assert.ok(result.ok)
  assert.equal(result.listings.length, 2)

  const hundred = result.listings.find(l => l.capacity_ah === 100)!
  assert.equal(hundred.sku, 'LFP12-100A')
  assert.equal(hundred.price_usd, 295)
  assert.equal(hundred.variant_id, 42687934070921)
  assert.match(hundred.model, /^12V 100Ah LiFePo4/)

  const twoHundred = result.listings.find(l => l.capacity_ah === 200)!
  // The battery that has never been in the catalogue: $589, not the $299
  // refurbished unit and not the $1170 two-pack.
  assert.equal(twoHundred.sku, 'LFP12-200A')
  assert.equal(twoHundred.price_usd, 589)
  assert.equal(twoHundred.capacity_kwh, 2.4)
  assert.equal(twoHundred.variant_id, 43342854193289)
  assert.match(twoHundred.model, /^12V 200Ah LiFePo4/)

  assert.ok(result.listings.every(l => l.from_multi_capacity_page))
})

test('a kWh figure gives a capacity only when it divides into whole amp-hours', () => {
  // 5.12kWh ÷ the marketing 48V is 106.67Ah. ÷ the real 51.2V pack it is
  // exactly 100Ah, which is both the right answer and the evidence that the
  // pack voltage was right — so the row comes out 51.2V/5.12kWh, matching what
  // the title says instead of the 48V/4.8kWh row #20 has carried since August.
  assert.deepEqual(capacityFromEnergy('5.12KWH Wall-mounted LiFePO4 Battery SG48100M', 48), {
    voltage: 51.2,
    capacity_ah: 100,
  })
  // Nothing to divide, and a figure that divides into a fraction: both refused.
  assert.equal(capacityFromEnergy('Wall-mounted LiFePO4 Battery', 48), null)
  assert.equal(capacityFromEnergy('5.00KWH Wall-mounted LiFePO4 Battery', 48), null)

  const wallMount = product({
    title: '5.12KWH Wall-mounted LiFePO4 Lithium Battery SG48100M UL1973',
    tags: ['100M', '48V', 'Up to 5kWh', 'Wall-Mount'],
    variants: [
      { id: 7203, title: '1 Unit [Brand New]', sku: 'SG48100M', price: 113000 },
      { id: 7204, title: '1 Unit [Refurbished]', sku: 'SG48100MRE', price: 79100 },
    ],
  })
  const result = parseSungoldProduct(wallMount)
  assert.ok(result.ok)
  assert.equal(result.listings[0].voltage, 51.2)
  assert.equal(result.listings[0].capacity_ah, 100)
  assert.equal(result.listings[0].capacity_kwh, 5.12)
  assert.equal(result.listings[0].price_usd, 1130)
  assert.equal(result.listings[0].variant_id, null)
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
    variants: [{ id: 7352, title: 'Default Title', sku: 'PowerMax 314 Outdoor', price: 299500 }],
  })
  const parsed = parseSungoldProduct(powerMax)
  assert.ok(parsed.ok)
  const powerMaxRow = parsed.listings[0]
  assert.equal(powerMaxRow.voltage, 51.2)
  assert.equal(powerMaxRow.capacity_ah, 314)
  assert.equal(powerMaxRow.capacity_kwh, 16.08)
  assert.equal(powerMaxRow.price_usd, 2995)

  const coreX = product({
    title: 'CoreX 5 Pro Server Rack 48V 100AH Residential Energy Storage Battery Pack Wi‑Fi & Bluetooth',
    tags: ['48V', 'CoreXpro', 'Rack-Mount'],
    variants: [{ id: 7203, title: '1 Unit [Brand New]', sku: 'CoreX 5 Pro', price: 115000 }],
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
  assert.match(result.listings[0].model, /Lithium {2}Battery/)
})

test('a SKU sold on two pages is kept once, from its dedicated page', () => {
  // LFP12-100A is sold on its own page and as the 100ah variant of the
  // "100Ah/ 200Ah" page. Without this, every weekly run offers the review
  // queue a second copy of a battery the catalogue already has.
  const own = parseSungoldProduct(product({
    title: '12V 100AH LiFePO4 Deep Cycle Lithium Battery',
    tags: ['12V'],
    variants: [{ id: 1, title: '1 Unit [Brand New]', sku: 'LFP12-100A', price: 29500 }],
  }))
  assert.ok(own.ok)
  const dedicated = {
    listing: own.listings[0],
    source_url: 'https://sungoldpower.com/products/12v-100ah-lifepo4-deep-cycle-lithium-battery',
  }
  const shared = parseSungoldProduct(product({
    title: '12V 100Ah/ 200Ah LiFePo4 Deep Cycle Lithium Battery',
    tags: ['12V'],
    variants: [
      { id: 43342854193289, title: '200ah [Brand New] / 1 Unit', sku: 'LFP12-200A', price: 58900 },
      { id: 42687934070921, title: '100ah / 1 Unit', sku: 'LFP12-100A', price: 29500 },
    ],
  }))
  assert.ok(shared.ok)
  const sharedRows = shared.listings.map(listing => ({
    listing,
    source_url: `https://sungoldpower.com/products/12v-200ah-lithium-iron-phosphate-battery?variant=${listing.variant_id}`,
  }))

  const { kept, dropped } = oneRowPerSku([...sharedRows, dedicated])
  assert.deepEqual(kept.map(k => k.listing.sku).sort(), ['LFP12-100A', 'LFP12-200A'])
  assert.equal(kept.find(k => k.listing.sku === 'LFP12-100A')!.source_url, dedicated.source_url)
  assert.equal(dropped.length, 1)
  assert.match(dropped[0].row.source_url, /\?variant=42687934070921$/)
})
