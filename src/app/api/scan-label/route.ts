import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate-limit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// This is called anonymously from the public load calculator — no login
// wall on a core calculator page — so "gate it" means bound the abuse
// surface (cost from unlimited Anthropic calls, oversized uploads), not
// require auth. Same IP resolution as auth/callback/route.ts: nginx sets
// x-forwarded-for on staging and any future self-hosted deploy.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 60 * 1000
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number]

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    if (!checkRateLimit(`scan-label:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
      return NextResponse.json({ error: 'too many requests, try again later' }, { status: 429 })
    }

    const form = await req.formData()
    const file = form.get('image') as File | null
    if (!file) return NextResponse.json({ error: 'no image' }, { status: 400 })
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'image too large' }, { status: 413 })
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMime)) {
      return NextResponse.json({ error: 'unsupported image type' }, { status: 415 })
    }

    const bytes  = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mime   = file.type as AllowedMime

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mime, data: base64 },
          },
          {
            type: 'text',
            text: `This is a photo of an appliance nameplate or energy label. Extract the electrical specifications.

Return ONLY a JSON object with these fields (omit any you cannot find):
{
  "name": "appliance type and model if visible (e.g. 'Central AC - Carrier 50XCQ060')",
  "watts": <running watts as a number. If only amps and volts are shown, calculate watts = amps × volts>,
  "hours": <typical daily hours of use — use your knowledge of the appliance type, e.g. 8 for AC, 24 for fridge>
}

If the label shows a SEER rating and BTU, estimate watts as BTU / SEER.
If you cannot determine wattage at all, return {"error": "label unreadable"}.
Return only the JSON, no explanation.`,
          },
        ],
      }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const json = JSON.parse(text.replace(/```json?|```/g, '').trim())

    if (json.error) return NextResponse.json({ error: json.error }, { status: 422 })
    return NextResponse.json(json)

  } catch (err) {
    console.error('scan-label error:', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
