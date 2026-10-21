'use server'

// "Read from datasheet" on the /admin/catalog verify form: fetch the PDF and
// have Claude read this model's column into the form. It fills fields and says
// where each came from; it never verifies. See src/lib/datasheet-extract.ts.
//
// Admin-only, rate-limited, and the fetch is narrow on purpose: https only,
// at most one hop from a share page to the PDF it links, a %PDF header check,
// and a size cap. It runs server-side with the app's API key, so it must not
// become a general URL fetcher.

import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  MAX_DATASHEET_BYTES, extractionPrompt, extractionSchema, normalizeExtraction, pdfLinkInHtml,
  type Extraction,
} from '@/lib/datasheet-extract'

export type ReadDatasheetResult = { ok: true; extraction: Extraction; pdfUrl: string } | { ok: false; error: string }

const USER_AGENT = 'ZonZelfBot/0.1 (+https://zonzelf.com; datasheet review)'

async function fetchPdf(url: string): Promise<{ bytes: Uint8Array; pdfUrl: string }> {
  let target = url
  for (let hop = 0; hop < 2; hop++) {
    if (!/^https:\/\//i.test(target)) throw new Error('Only https links can be read.')
    const res = await fetch(target, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' })
    if (!res.ok) throw new Error(`The datasheet link answered HTTP ${res.status}.`)
    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_DATASHEET_BYTES) throw new Error('That file is larger than 20 MB.')
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength > MAX_DATASHEET_BYTES) throw new Error('That file is larger than 20 MB.')

    // %PDF — the only thing that counts as a datasheet here, whatever the
    // Content-Type header claims.
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return { bytes, pdfUrl: target }
    }
    const next = hop === 0 ? pdfLinkInHtml(new TextDecoder().decode(bytes)) : null
    if (!next) throw new Error('That link is not a PDF, and no PDF link was found on the page it opens.')
    target = next
  }
  throw new Error('No PDF found.')
}

export async function readDatasheet(id: number, url: string): Promise<ReadDatasheetResult> {
  const { user } = await requireAdmin()
  if (!checkRateLimit(`read-datasheet:${user.id}`, 20, 60 * 60 * 1000)) {
    return { ok: false, error: 'That is 20 datasheets this hour — try again later.' }
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'Datasheet reading is not configured here (no ANTHROPIC_API_KEY).' }
  }

  const supabase = await createClient()
  const { data: model, error } = await supabase
    .from('component_models').select('category, brand, model, mpn').eq('id', id).single()
  if (error) return { ok: false, error: error.message }
  const category = model.category as 'panel' | 'inverter' | 'battery'

  let pdf: { bytes: Uint8Array; pdfUrl: string }
  try {
    pdf = await fetchPdf(url.trim())
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const response = await client.beta.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      // Server-side refusal fallback, on by default for this model. A
      // datasheet should never trip a safety classifier; if one does, the
      // request is re-run on the fallback model instead of failing.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Built per category at runtime, so its static type is wider than the
      // helper's generic; normalizeExtraction() checks the parsed result.
      output_config: { format: jsonSchemaOutputFormat(extractionSchema(category) as unknown as Parameters<typeof jsonSchemaOutputFormat>[0]) },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: Buffer.from(pdf.bytes).toString('base64') },
          },
          { type: 'text', text: extractionPrompt(category, model) },
        ],
      }],
    })
    if (response.stop_reason === 'refusal') {
      return { ok: false, error: 'The model declined to read this document.' }
    }
    if (response.stop_reason === 'max_tokens' || response.parsed_output == null) {
      return { ok: false, error: 'The datasheet could not be read into the form. Type the figures in by hand.' }
    }
    return { ok: true, extraction: normalizeExtraction(response.parsed_output, category), pdfUrl: pdf.pdfUrl }
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: 'The reading service is busy — try again in a minute.' }
    if (e instanceof Anthropic.BadRequestError) return { ok: false, error: `The reading service refused the file: ${e.message}` }
    if (e instanceof Anthropic.APIError) return { ok: false, error: `The reading service failed (HTTP ${e.status}).` }
    throw e
  }
}
