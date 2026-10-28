import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toCatalogBattery, toShelfItem, type BatteryShelfRow, type ParsedBatteryLike } from '../battery-catalog'

// Live battery_models rows, 2026-10-02.
const EG4_280_AW: ParsedBatteryLike = {
  brand: 'EG4', model: 'WallMount 280Ah All Weather Battery', sku: 'EG4LL48V100AODWMBV2',
  chemistry: 'lifepo4', voltage: 51.2, capacity_ah: 280, capacity_kwh: 14.34, dod_rated: 80,
  price_usd: 3124.99, source_url: 'https://eg4electronics.com/categories/batteries/eg4-wallmount-all-weather-battery/',
  retailer: 'Signature Solar',
  retailer_url: 'https://signaturesolar.com/eg4-wallmount-all-weather-lithium-battery-48v-280ah-14-3kwh-lifepo4-all-weather-energy-storage-ul1973-ul9540a-10-year-warranty/',
}

test('a reseller price on a manufacturer battery is a listing on the reseller, keyed on the SKU', () => {
  const item = toCatalogBattery(EG4_280_AW)
  assert.equal(item.retailer, 'Signature Solar')
  assert.equal(item.retailer_product_id, 'EG4LL48V100AODWMBV2')
  assert.equal(item.url, EG4_280_AW.retailer_url)
  assert.equal(item.price_usd, 3124.99)
  // The manufacturer page stays the citation.
  assert.equal(item.spec_sheet_url, EG4_280_AW.source_url)
  assert.equal(item.mpn, 'EG4LL48V100AODWMBV2')
  assert.deepEqual(item.battery, { chemistry: 'lifepo4', voltage: 51.2, capacity_ah: 280, capacity_kwh: 14.34, dod_rated: 80 })
})

test('a manufacturer page that sells nothing gets no listing and no price', () => {
  const item = toCatalogBattery({
    brand: 'Victron', model: 'Lithium Battery Smart 12.8V 100Ah', sku: null,
    chemistry: 'lifepo4', voltage: 12.8, capacity_ah: 100, capacity_kwh: 1.28, dod_rated: null,
    price_usd: 999, source_url: 'https://www.victronenergy.com/upload/documents/Datasheet-Lithium-Battery-Smart-EN.pdf',
  })
  assert.equal(item.retailer, null)
  assert.equal(item.price_usd, null)
  assert.equal(item.mpn, null)
})

test('a manufacturer that is also the shop lists on its own page', () => {
  const item = toCatalogBattery({
    brand: 'SunGoldPower', model: 'SG48100M', sku: 'SG48100M',
    chemistry: 'lifepo4', voltage: 51.2, capacity_ah: 100, capacity_kwh: 5.12, dod_rated: null,
    price_usd: 1130, source_url: 'https://sungoldpower.com/products/5-12kwh-wall-mounted-lifepo4-lithium-battery',
  })
  assert.equal(item.retailer, 'SunGoldPower')
  assert.equal(item.brand, 'Sun Gold Power')
  assert.equal(item.url, 'https://sungoldpower.com/products/5-12kwh-wall-mounted-lifepo4-lithium-battery')
  assert.equal(item.retailer_product_id, 'SG48100M')
  assert.equal(item.price_usd, 1130)
})


const NOW = new Date('2026-10-02T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()
function shelfRow(listings: BatteryShelfRow['component_listings']): BatteryShelfRow {
  return {
    id: 126, brand: 'EG4', model: 'WallMount 280Ah All Weather Battery',
    spec_sheet_url: 'https://eg4electronics.com/x/',
    battery_specs: { chemistry: 'lifepo4', voltage: 51.2, capacity_ah: 280, capacity_kwh: 14.34 },
    component_listings: listings,
  }
}
const L = (url: string, price: number | null, at: string | null, pack_qty = 1) => ({ retailer: 'Shop', url, pack_qty, price_usd: price, price_scraped_at: at })

test('the shelf shows the cheapest current single, with its shop link and date', () => {
  const item = toShelfItem(shelfRow([L('https://a/', 3124.99, daysAgo(4)), L('https://b/', 2999, daysAgo(2)), L('https://c/', 2500, daysAgo(2), 4)]), NOW)
  assert.equal(item.price_usd, 2999)
  assert.equal(item.retailer_url, 'https://b/')
  assert.equal(item.source_url, 'https://eg4electronics.com/x/')
  assert.equal(item.capacity_kwh, 14.34)
})

test('an expired price loses to a current one, but is kept when it is all there is', () => {
  assert.equal(toShelfItem(shelfRow([L('https://old/', 1000, daysAgo(60)), L('https://new/', 3000, daysAgo(1))]), NOW).price_usd, 3000)
  const onlyOld = toShelfItem(shelfRow([L('https://old/', 1000, daysAgo(60))]), NOW)
  assert.equal(onlyOld.price_usd, 1000)
  assert.equal(onlyOld.price_scraped_at, daysAgo(60))
})

test('a manufacturer-only battery has no price and no shop', () => {
  const item = toShelfItem(shelfRow([]), NOW)
  assert.equal(item.price_usd, null)
  assert.equal(item.retailer_url, null)
})
