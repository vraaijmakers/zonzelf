import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modelName, parseSku, shopifyListings, specSheetIn, wattsFromMpn, type ShopifyProduct } from '../shopify-catalog'

// Every SKU below is real, from sungoldpower.com collection JSON on 2026-10-01.
test('pack suffixes split into part number and pack size', () => {
  assert.deepEqual(parseSku('SG550WMx2'), { ok: true, mpn: 'SG550WM', packQty: 2 })
  assert.deepEqual(parseSku('SG550WMx32'), { ok: true, mpn: 'SG550WM', packQty: 32 })
  assert.deepEqual(parseSku('SG100WMX4'), { ok: true, mpn: 'SG100WM', packQty: 4 })
  assert.deepEqual(parseSku('SGN-440-SW5x31'), { ok: true, mpn: 'SGN-440-SW5', packQty: 31 })
  assert.deepEqual(parseSku('SPH8048Px2'), { ok: true, mpn: 'SPH8048P', packQty: 2 })
  assert.deepEqual(parseSku('SPH6548P*2'), { ok: true, mpn: 'SPH6548P', packQty: 2 })
})

test('single units keep their whole SKU as the part number', () => {
  assert.deepEqual(parseSku('SPH8048P'), { ok: true, mpn: 'SPH8048P', packQty: 1 })
  assert.deepEqual(parseSku('SGN7.6K1HB-48'), { ok: true, mpn: 'SGN7.6K1HB-48', packQty: 1 })
  assert.deepEqual(parseSku('SGS-12K18MAX'), { ok: true, mpn: 'SGS-12K18MAX', packQty: 1 })
  // Ends in a letter-x but is not a pack: no digits after the x.
  assert.deepEqual(parseSku('SG11.4KHB-HV'), { ok: true, mpn: 'SG11.4KHB-HV', packQty: 1 })
})

test('kits, refurbished and open-box units, and blank SKUs are skipped', () => {
  for (const sku of ['SPH8048P+2*SG48100P', 'SPH10048P+2*SG48200T', '2XSPH6548P+2XSG48100P', 'LFPV12K48V240VSP+4XSG48100P']) {
    assert.equal(parseSku(sku).ok, false, sku)
  }
  assert.deepEqual(parseSku('LFP4K12V240VSPRE'), { ok: false, reason: 'refurbished or open box' })
  assert.deepEqual(parseSku('LFP6K48V240VSPLOB'), { ok: false, reason: 'refurbished or open box' })
  assert.equal(parseSku('').ok, false)
  assert.equal(parseSku(null).ok, false)
})

test('the wattage is read from the part number, for pages that sell two', () => {
  assert.equal(wattsFromMpn('SG550WM'), 550)
  assert.equal(wattsFromMpn('SGN-440-SW5'), 440)
  assert.equal(wattsFromMpn('SPH8048P'), null)
})

test('a spec-sheet PDF in the description is found, entities decoded', () => {
  assert.equal(
    specSheetIn('<a href="https://cdn.shopify.com/s/files/1/0323/4090/2025/files/182Mono550W-SG550WM-20260720.pdf?v=1&amp;x=2">Spec</a>'),
    'https://cdn.shopify.com/s/files/1/0323/4090/2025/files/182Mono550W-SG550WM-20260720.pdf?v=1&x=2',
  )
  assert.equal(specSheetIn('<p>no sheet</p>'), null)
})

const SPH8048P_PAGE: ShopifyProduct = {
  id: 1,
  title: '8KW 48V Split Phase Solar Inverter',
  handle: '8kw-off-grid-solar-inverter-ul1741',
  images: [{ src: 'https://cdn.shopify.com/a.jpg' }],
  variants: [
    { id: 11, sku: 'SPH8048P', title: 'Only Inverter', price: '1450.00', available: true },
    { id: 12, sku: 'SPH8048P+2*SG48100P', title: '2 X SG48100P [10.24kwh]', price: '3600.00', available: true },
    { id: 13, sku: 'SPH8048Px2', title: 'Parallel pair', price: '2890.00', available: false },
  ],
}

test('a product page yields its new, in-stock, non-kit variants, each with its own URL', () => {
  const { listings, skipped } = shopifyListings(SPH8048P_PAGE, 'https://sungoldpower.com')
  assert.equal(listings.length, 1)
  assert.deepEqual(listings[0], {
    mpn: 'SPH8048P', packQty: 1, variantId: 11,
    title: '8KW 48V Split Phase Solar Inverter — Only Inverter',
    priceUsd: 1450, url: 'https://sungoldpower.com/products/8kw-off-grid-solar-inverter-ul1741?variant=11',
    imageUrl: 'https://cdn.shopify.com/a.jpg', specSheetUrl: null,
  })
  assert.deepEqual(skipped, ['SPH8048P+2*SG48100P: a kit with other products in it', 'SPH8048Px2: out of stock'])
})

// Pages that sell several models under one title. Each model needs its own name.
test('a page covering several models names each by its part number', () => {
  assert.equal(modelName('370W/ 415W/ 500W Mono Black PERC Solar Panel UL 61730 CEC Listed', 'SG415WM'), 'SG415WM Mono Black PERC Solar Panel UL 61730 CEC Listed')
  assert.equal(modelName('450/ 550 Watt Monocrystalline PERC Solar Panel', 'SG550WM'), 'SG550WM Monocrystalline PERC Solar Panel')
  assert.equal(modelName('12000W/ 15000W/ 18000W 48V Split Phase Pure Sine Wave Inverter Charger', 'LFPV15K48V240VSP'), 'LFPV15K48V240VSP 48V Split Phase Pure Sine Wave Inverter Charger')
  assert.equal(modelName('6000W DC 24V/ 48V Split Phase Pure Sine Wave Inverter With Charger', 'LFP6K24V240VSP'), 'LFP6K24V240VSP DC 24V/ 48V Split Phase Pure Sine Wave Inverter With Charger')
  assert.equal(modelName('8KW 48V Split Phase Solar Inverter', 'SPH8048P'), '8KW 48V Split Phase Solar Inverter')
  // Naming a name twice changes nothing.
  const once = modelName('6000W DC 24V/ 48V Split Phase Pure Sine Wave Inverter With Charger', 'LFP6K24V240VSP')
  assert.equal(modelName(once, 'LFP6K24V240VSP'), once)
})
