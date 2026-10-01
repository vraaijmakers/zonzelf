import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CEC_PV_HEADER, assertCecHeader, excelSerialToIsoDate, findCecMatch, modelKey, parseCecRow,
  type CecPvModule,
} from '../cec-pv'
import {
  classifyProduct, extractJsonObject, modelNameFromTitle, packQuantity, parseBigCommerceProduct,
  parseDimensionsMm, parseMinimumPurchase, parsePalletSize, parseWatts,
} from '../bigcommerce-product'
import { PRICE_HOLD_THRESHOLD, decideListingPrice } from '../listing-price'

// ---------------------------------------------------------------------------
// CEC PV module list
// ---------------------------------------------------------------------------

/** A CEC data row with the named columns set, everything else blank. */
function cecRow(values: Partial<Record<(typeof CEC_PV_HEADER)[number], unknown>>): unknown[] {
  return CEC_PV_HEADER.map(c => values[c] ?? null)
}

// The SG550WM as the CEC list files it (2026-09-30). Its datasheet says
// beta-Voc -0.35; this says -0.259. Kept as a fixture because it is the reason
// CEC rows are candidates and never verified specs.
const SG550WM_ROW = cecRow({
  'Manufacturer': 'Sun Gold Power Inc',
  'Model Number': 'SG550WM',
  'Description': '550 W, 144 cell monocrystalline module, white backsheet, 1500V max system Vdc',
  'Nameplate Pmax': 550,
  'Technology': 'Mono-c-Si',
  'N_s': 72, // cells in SERIES: 144 half-cut cells wired as two strings of 72
  'Nameplate Isc': 14.01,
  'Nameplate Voc': 49.9,
  'Nameplate Ipmax': 13.11,
  'Nameplate Vpmax': 42,
  'γPmax': -0.339,
  // The live sheet really does pad some numeric cells with newlines.
  'βVoc': '\n \n-0.259',
  'CEC Listing Date': 45870, // 2025-08-01
})

test('a CEC row parses into typed electricals, padded strings included', () => {
  const m = parseCecRow(SG550WM_ROW)!
  assert.equal(m.model_key, 'SG550WM')
  assert.equal(m.voc_v, 49.9)
  assert.equal(m.beta_voc_pct, -0.259)
  assert.equal(m.gamma_pmax_pct, -0.339)
  assert.equal(m.cells_in_series, 72)
  assert.equal(m.bifacial, false)
  assert.equal(m.listed_on, '2025-08-01')
  assert.equal(m.pending_removal, false)
})

test('bifacial is read from the description, misspelling included', () => {
  const row = (d: string) => parseCecRow(cecRow({ 'Manufacturer': 'Trina Solar', 'Model Number': 'X', 'Description': d }))!
  assert.equal(row('420 W,144 third-cut cell bifaical monocrystalline module').bifacial, true)
  assert.equal(row('550 W, 144 cell monocrystalline module').bifacial, false)
})

test('blank and footer rows are skipped', () => {
  assert.equal(parseCecRow(cecRow({})), null)
  assert.equal(parseCecRow(cecRow({ 'Manufacturer': 'Acme' })), null)
})

test('a sheet whose columns moved is refused, not read by the wrong position', () => {
  assert.doesNotThrow(() => assertCecHeader([...CEC_PV_HEADER]))
  const shifted = [...CEC_PV_HEADER]
  ;[shifted[15], shifted[16]] = [shifted[16], shifted[15]] // Isc <-> Voc
  assert.throws(() => assertCecHeader(shifted), /Nameplate Isc/)
})

test('model keys ignore punctuation, case and the CEC variant suffix', () => {
  assert.equal(modelKey('TSM-420NE09RC.05'), 'TSM420NE09RC05')
  assert.equal(modelKey('hin-t440nf(bk)'), 'HINT440NFBK')
  assert.equal(modelKey('JKM400M-54HL4-B {Wht}'), 'JKM400M54HL4B')
})

test('excel serial dates convert, junk does not', () => {
  assert.equal(excelSerialToIsoDate(44978), '2023-02-21')
  assert.equal(excelSerialToIsoDate(null), null)
  assert.equal(excelSerialToIsoDate('No Information Submitted'), null)
})

function mod(model_number: string, pmax_w: number, over: Partial<CecPvModule> = {}): CecPvModule {
  return {
    ...parseCecRow(cecRow({ 'Manufacturer': 'Trina Solar', 'Model Number': model_number }))!,
    pmax_w, voc_v: 50, isc_a: 10, vmp_v: 42, imp_a: 9.5, beta_voc_pct: -0.25,
    ...over,
  }
}

// Signature Solar lists the Trina Vertex 420W with part number TSM-NE09RC.05;
// the CEC files it as TSM-420NE09RC.05 alongside the 415 and 425.
const TRINA_FAMILY = [
  mod('TSM-415NE09RC.05', 415, { voc_v: 50.5 }),
  mod('TSM-420NE09RC.05', 420, { voc_v: 50.9 }),
  mod('TSM-425NE09RC.05', 425, { voc_v: 51.4 }),
]

test('an exact part number matches', () => {
  const m = findCecMatch('TSM-420NE09RC.05', 420, TRINA_FAMILY)
  assert.equal(m.kind, 'exact')
  assert.equal(m.kind === 'exact' && m.module.voc_v, 50.9)
})

test('a family part number matches only through the wattage', () => {
  const m = findCecMatch('TSM-NE09RC.05', 420, TRINA_FAMILY)
  assert.equal(m.kind, 'family')
  assert.equal(m.kind === 'family' && m.module.model_number, 'TSM-420NE09RC.05')
})

test('a family part number with no wattage is not guessed', () => {
  assert.equal(findCecMatch('TSM-NE09RC.05', null, TRINA_FAMILY).kind, 'none')
})

test('two matches that disagree electrically are not guessed between', () => {
  const rows = [mod('ABC-400-X', 400, { voc_v: 37 }), mod('ABC-400-X-BLK', 400, { voc_v: 41 })]
  const m = findCecMatch('ABC-400', 400, rows)
  assert.equal(m.kind, 'none')
  assert.match(m.kind === 'none' ? m.reason : '', /different electricals/)
})

test('duplicate filings of the same electrical module are one answer', () => {
  const rows = [mod('ABC-400-X', 400), mod('ABC-400-X-BLK', 400)]
  assert.equal(findCecMatch('ABC-400', 400, rows).kind, 'family')
})

test('modules being removed from the list are not matched', () => {
  const rows = [mod('SG550WM', 550, { pending_removal: true })]
  assert.equal(findCecMatch('SG550WM', 550, rows).kind, 'none')
})

test('very short part numbers are refused rather than substring-matched', () => {
  assert.equal(findCecMatch('M-4', 400, [mod('JKM400M-4', 400)]).kind, 'none')
})

// ---------------------------------------------------------------------------
// BigCommerce product pages
// ---------------------------------------------------------------------------

function page(product: object, extra = ''): string {
  return `<html><head><meta property="product:price:amount" content="1.00" /></head><body>
    <script>window.BigCommerce = window.BigCommerce || {}
    window.BigCommerce.product = ${JSON.stringify(product)};</script>${extra}</body></html>`
}

const TRINA = {
  id: 11977,
  title: 'Trina Vertex 420W Bifacial Solar Panel',
  brand: { name: 'Trina' },
  sku: '1400072',
  mpn: null,
  url: 'https://signaturesolar.com/trina-vertex-420w-bifacial-solar-panel/',
  price: { without_tax: { value: 125.45 } },
  category: ['All Products', 'All Products/Solar Panels', 'All Products/Solar Panels/Individual Panels'],
  min_purchase_quantity: 0,
  main_image: { data: 'https://cdn11.bigcommerce.com/s-x/images/stencil/{:size}/products/11977/a.jpg' },
  custom_fields: [
    { name: 'Wattage', value: '420W' },
    { name: 'Minimum Purchase', value: '10 Units' },
    { name: 'Dimensions', value: '69.37 × 44.65 × 1.18 in' },
    { name: 'Manufacture Part#', value: 'TSM-NE09RC.05' },
    { name: 'Spec Sheet', value: '<a target="_blank" href="/content/downloads/Spec%20sheets/x.pdf"><button class="button">Download</button></a>' },
    { name: 'opt#Protect Your Panels~order:1$qty=1', value: 'nrqd~1578001' },
  ],
}

test('the product object is read, not the first custom_fields on the page', () => {
  // A related product rendered before the real one must not win.
  const related = `<script>var x = {"custom_fields":[{"name":"Wattage","value":"440W"}]}</script>`
  const p = parseBigCommerceProduct(related + page(TRINA), TRINA.url)!
  assert.equal(p.id, 11977)
  assert.equal(p.fields['Wattage'], '420W')
  assert.equal(p.mpn, 'TSM-NE09RC.05')
  assert.equal(p.brand, 'Trina')
  assert.equal(p.price_usd, 125.45)
  assert.equal(p.image_url, 'https://cdn11.bigcommerce.com/s-x/images/stencil/1280x1280/products/11977/a.jpg')
  assert.equal(p.spec_sheet_url, 'https://signaturesolar.com/content/downloads/Spec%20sheets/x.pdf')
  assert.equal(p.fields['opt#Protect Your Panels~order:1$qty=1'], undefined)
})

test('braces and quotes inside a description do not end the object early', () => {
  const html = `x = {"a":"he said \\"}\\" {not} done","b":{"c":1}} trailing`
  assert.deepEqual(extractJsonObject(html, 'x ='), { a: 'he said "}" {not} done', b: { c: 1 } })
})

test('a page with no product object parses to null', () => {
  assert.equal(parseBigCommerceProduct('<html></html>', 'https://x'), null)
})

test('products are classified by category path, and kits are skipped', () => {
  assert.equal(classifyProduct(parseBigCommerceProduct(page(TRINA), TRINA.url)!), 'panel')
  assert.equal(classifyProduct({
    title: 'EG4 | 6000XP Off-Grid Inverter',
    categories: ['All Products/Inverters', 'All Products/Inverters/Off-Grid Inverters'],
  }), 'inverter')
  assert.equal(classifyProduct({
    title: '18kPV Hybrid Inverter and 48V SimpliPhi Battery Outdoor-Ready Bundle',
    categories: ['All Products/Inverters/Hybrid Inverters'],
  }), null)
  assert.equal(classifyProduct({
    title: 'EG4 Inverter Wall Mount Bracket',
    categories: ['All Products/Inverters/Inverter Accessories'],
  }), null)
  assert.equal(classifyProduct({
    title: 'IronRidge XR100 Rail',
    categories: ['All Products/Solar Panels/Mounting Hardware'],
  }), null)
})

// Every title below was filed under an inverter subcategory on 2026-09-30.
test('inverter accessories and commercial three-phase units are not inverters', () => {
  const inv = (title: string) => classifyProduct({ title, categories: ['All Products/Inverters/Microinverters'] })
  for (const t of [
    'EG4 | 6000XP Off-Grid Inverter',
    'Victron MultiPlus-II 48/8000 | 48v Input | 8000VA Output 230V | 110A Charger | Transfer Switch',
    'Victron Quattro 48/5000 | 48V Input | 5000VA Output 120V | 70A Charger | Transfer Switch',
    'Enphase IQ8+ Microinverter',
    'OutBack Power | Radian A-Series | 8kW Hybrid Inverter',
  ]) assert.equal(inv(t), 'inverter', t)
  for (const t of [
    'Enphase | 1.7 Meter Cable | Landscape Orientation',
    'Aptos | AC Trunk Cable 2.2M',
    'Enphase Terminator Cap',
    'Duracell Power Center | T-Connector Unlocking Tool',
    'NEP | Micro Inverter Home Run Cable 12 AWG | 16 Ft Length',
    'Duracell Power Center | Communication Gateway + Consumer Grade Meter + WiFi',
    'Solis | 100kW Three Phase Inverter | Ten MPPT w/ AFCI w/ FAN',
    'NEP | 30kW | Neptune 30kW | 3 Phase String Inverter | 208 VAC',
  ]) assert.equal(inv(t), null, t)
})

test('panel field parsers', () => {
  assert.equal(parseWatts('420W'), 420)
  assert.equal(parseWatts('420W / 440W'), null)
  assert.deepEqual(parseDimensionsMm('69.37 × 44.65 × 1.18 in'), { length_mm: 1762, width_mm: 1134, thickness_mm: 30 })
  assert.deepEqual(parseDimensionsMm('67.8in x 44.6in x 1.2in'), { length_mm: 1722, width_mm: 1133, thickness_mm: 30 })
  assert.deepEqual(parseDimensionsMm('2278*1134*35mm'), { length_mm: 2278, width_mm: 1134, thickness_mm: 35 })
  assert.equal(parseDimensionsMm('69.37 × 44.65 × 1.18'), null)
  assert.equal(parsePalletSize('36 Solar Panels'), 36)
  assert.equal(parseMinimumPurchase('10 Units'), 10)
})

test('a pallet and its single name the same model', () => {
  assert.equal(modelNameFromTitle('Seraphim 440W Bifacial Solar Panel', 'Seraphim Solar'), '440W Bifacial Solar Panel')
  assert.equal(modelNameFromTitle('Pallet of Seraphim 440W Bifacial Solar Panels (36 panels)', 'Seraphim Solar'), '440W Bifacial Solar Panel')
  assert.equal(modelNameFromTitle('EG4 | 6000XP Off-Grid Inverter', 'EG4 Electronics'), '6000XP Off-Grid Inverter')
  // Suffix styles seen on the first live run, each of which forked a model.
  assert.equal(modelNameFromTitle('Peimar 450W Mono PERC Solar Panel | 31 Panels', 'Peimar'), '450W Mono PERC Solar Panel')
  assert.equal(
    modelNameFromTitle('Lumina SolarSpace 405W Monofacial Solar Panel Pallet | 36 Panel', 'Solar Space'),
    'Lumina SolarSpace 405W Monofacial Solar Panel')
  // A brand that is a prefix of a longer word is not stripped.
  assert.equal(modelNameFromTitle('Sunpower X22', 'Sun'), 'Sunpower X22')
})

test('pack quantity comes from the field, then the title, and an unsized pallet is refused', () => {
  assert.equal(packQuantity({ title: 'Trina 420W', fields: {} }), 1)
  assert.equal(packQuantity({ title: 'Pallet of Trina 420W', fields: { 'Pallet Size': '36 Solar Panels' } }), 36)
  assert.equal(packQuantity({ title: 'Pallet of Seraphim 440W Bifacial Solar Panels (36 panels)', fields: {} }), 36)
  assert.equal(packQuantity({ title: 'Pallet of Seraphim 440W', fields: {} }), null)
})

// ---------------------------------------------------------------------------
// Listing prices
// ---------------------------------------------------------------------------

test('an ordinary price move on a published listing is written, dated', () => {
  assert.deepEqual(decideListingPrice(125.45, 119.99, true), { action: 'write', price_usd: 119.99 })
})

test('a price that jumps past the threshold on a published listing is held', () => {
  const d = decideListingPrice(125.45, 12.55, true)
  assert.equal(d.action, 'hold')
  assert.ok(d.action === 'hold' && Math.abs(d.change) > PRICE_HOLD_THRESHOLD)
})

test('unpublished listings are never held', () => {
  assert.deepEqual(decideListingPrice(125.45, 12.55, false), { action: 'write', price_usd: 12.55 })
})

test('an unchanged price is confirmed, and a missing one changes nothing', () => {
  assert.deepEqual(decideListingPrice(125.45, 125.45, true), { action: 'confirm' })
  assert.deepEqual(decideListingPrice(125.45, null, true), { action: 'none' })
  assert.deepEqual(decideListingPrice(null, 99, true), { action: 'write', price_usd: 99 })
})
