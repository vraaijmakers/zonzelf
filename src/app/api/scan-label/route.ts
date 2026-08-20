import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('image') as File | null
    if (!file) return NextResponse.json({ error: 'no image' }, { status: 400 })

    const bytes  = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mime   = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

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
