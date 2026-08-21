'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export type GlossaryEntry = {
  term: string
  aka?: string
  body: React.ReactNode
}

export default function GlossaryClient({ entries }: { entries: { term: string; aka?: string; html: string }[] }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter(e =>
      e.term.toLowerCase().includes(needle) ||
      (e.aka && e.aka.toLowerCase().includes(needle)) ||
      e.html.toLowerCase().includes(needle)
    )
  }, [q, entries])

  return (
    <div>
      <label htmlFor="glossary-search" className="block text-sm font-medium mb-1">
        Search terms
      </label>
      <input
        id="glossary-search"
        type="search"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Try: inverter, DoD, AWG, peak sun…"
        className="w-full border rounded-lg px-3 py-2 text-sm mb-8 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />

      {filtered.length === 0 && (
        <p className="text-sm text-zon-muted mb-8">
          Nothing matches “{q}”.{' '}
          <Link href="/guides" className="text-zon-gold-deep hover:underline">Back to guides</Link>
        </p>
      )}

      <dl className="space-y-8">
        {filtered.map(e => (
          <div key={e.term} id={slug(e.term)} className="scroll-mt-24">
            <dt className="text-lg font-semibold text-zon-ink">
              {e.term}
              {e.aka && <span className="ml-2 text-sm font-normal text-zon-muted">({e.aka})</span>}
            </dt>
            <dd
              className="text-zon-body mt-1 leading-relaxed [&_a]:text-zon-gold-deep [&_a]:hover:underline [&_strong]:text-zon-ink"
              dangerouslySetInnerHTML={{ __html: e.html }}
            />
          </div>
        ))}
      </dl>
    </div>
  )
}

function slug(term: string) {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
