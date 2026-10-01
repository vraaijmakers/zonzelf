// Reads the first worksheet of an .xlsx file into rows of cell values.
//
// Written for one file, the CEC PV module list (scripts/import-cec-pv.ts), and
// deliberately small: fflate unzips (pure JS, no native build — Homebrew is
// broken on the dev machine and production is Cloudflare), and the sheet XML
// is machine-generated OOXML regular enough to read with patterns. What it
// does NOT do: styles, dates (numbers come back as the raw Excel serial — see
// excelSerialToIsoDate in src/lib/cec-pv.ts), rich text runs beyond
// concatenation, or anything but the first sheet. Formula cells return their
// cached value, which is all the CEC list's computed columns (PTC, A_c) have.

import { unzipSync, strFromU8 } from 'fflate'

export type Cell = string | number | boolean | null

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
}

/** Every <t> run inside an element, concatenated — covers rich-text strings. */
function textOf(xml: string): string {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => decodeXml(m[1])).join('')
}

/** "AF18" → 31. */
function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)![0]
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

export function readFirstSheet(data: Uint8Array): Cell[][] {
  const files = unzipSync(data, {
    filter: f => f.name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet1\.xml$/.test(f.name),
  })
  const sheet = files['xl/worksheets/sheet1.xml']
  if (!sheet) throw new Error('xlsx: no xl/worksheets/sheet1.xml in the archive')

  const shared = files['xl/sharedStrings.xml']
    ? [...strFromU8(files['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => textOf(m[1]))
    : []

  const rows: Cell[][] = []
  const xml = strFromU8(sheet)
  for (const rowMatch of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const row: Cell[] = []
    for (const c of (rowMatch[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1]
      const body = c[2] ?? ''
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1]
      if (!ref) continue
      const type = attrs.match(/\bt="(\w+)"/)?.[1]
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]

      let value: Cell = null
      if (type === 's' && v !== undefined) value = shared[Number(v)] ?? null
      else if (type === 'inlineStr') value = textOf(body)
      else if (type === 'str' && v !== undefined) value = decodeXml(v)
      else if (type === 'b' && v !== undefined) value = v === '1'
      else if (v !== undefined) value = Number(v)

      row[columnIndex(ref)] = value
    }
    rows.push(Array.from(row, x => x ?? null))
  }
  return rows
}
