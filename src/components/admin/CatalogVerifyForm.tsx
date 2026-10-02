'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import { verifySpecs, type VerifyState } from '@/app/admin/catalog/actions'
import { readDatasheet } from '@/app/admin/catalog/read-datasheet'
import { INVERTER_FIELDS, PANEL_FIELDS } from '@/lib/catalog-view'
import type { Extraction } from '@/lib/datasheet-extract'

// Raw Tailwind for state text, for the reason given in admin/batteries/page.tsx:
// --zon-red/amber/green fall below 4.5:1 at 12-14px on paper.
const SEVERITY_TEXT = { fail: 'text-red-700', warn: 'text-amber-700', ok: 'text-green-700' } as const

/**
 * Specs typed in — or read in — from the manufacturer's datasheet.
 *
 * `initial` pre-fills the form ONLY with values that are safe to pre-fill:
 * figures a human already verified (re-verifying after a correction), and the
 * shop's physical fields. It never carries CEC electricals — a form that opens
 * full of CEC numbers is one click away from "verified" meaning "CEC", which
 * is the exact substitution the admission gate exists to refuse.
 *
 * "Read from datasheet" is different in kind: it reads the MANUFACTURER's
 * document (src/lib/datasheet-extract.ts), and every value it fills is marked
 * with the label it came from and stays marked until edited. It still never
 * verifies — that click, and the physics checks behind it, stay human.
 *
 * autoComplete is off throughout: the browser offering last panel's 440 as
 * this panel's Pmax is how a typo becomes a verified figure.
 */
export default function CatalogVerifyForm({
  id,
  category,
  initial,
  datasheetUrl,
}: {
  id: number
  category: 'panel' | 'inverter'
  initial: Record<string, string | number | boolean | null>
  datasheetUrl: string | null
}) {
  const [state, action, pending] = useActionState<VerifyState, FormData>(
    verifySpecs.bind(null, id),
    { status: 'idle', errors: [], flags: [] },
  )
  const [values, setValues] = useState<Record<string, string | number | boolean | null>>(initial)
  // Remounts the inputs so their defaultValue picks up a datasheet read.
  const [formKey, setFormKey] = useState(0)
  const [read, setRead] = useState<Extraction | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const [edited, setEdited] = useState<Set<string>>(new Set())
  const [reading, startReading] = useTransition()
  const urlRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const fields = category === 'panel' ? PANEL_FIELDS : INVERTER_FIELDS
  const input = 'appearance-none w-full text-sm border rounded px-2 py-1 bg-zon-paper'
  const filledFrom = (name: string) => (read && !edited.has(name) && name in read.values ? read.sources[name] ?? 'read from the datasheet' : null)
  const fieldClass = (name: string) => `${input} mt-0.5 ${filledFrom(name) ? 'border-zon-gold bg-zon-gold-tint' : 'border-zon-rule'}`
  const markEdited = (name: string) => setEdited(s => (s.has(name) ? s : new Set(s).add(name)))

  const readSheet = () => {
    const url = urlRef.current?.value.trim() ?? ''
    if (!url) {
      setReadError('Put the datasheet link in first.')
      return
    }
    startReading(async () => {
      setReadError(null)
      const result = await readDatasheet(id, url)
      if (!result.ok) {
        setReadError(result.error)
        return
      }
      setRead(result.extraction)
      if (result.extraction.found) {
        // What is in the form RIGHT NOW, typed or not — the remount below
        // would otherwise reset it to `values`.
        const typed: Record<string, string | boolean> = {}
        const now = new FormData(formRef.current!)
        for (const [k, v] of now.entries()) if (typeof v === 'string' && v.trim() !== '') typed[k] = v
        typed.bifacial = now.get('bifacial') === 'on'
        // Anything already in a field counts as the reviewer's, and is
        // never overwritten or marked as read from the sheet.
        setEdited(new Set(Object.keys(typed).filter(k => k !== 'bifacial')))
        // Read values fill EMPTY fields only.
        setValues(v => {
          const next: Record<string, string | number | boolean | null> = { ...v, ...typed }
          for (const [k, val] of Object.entries(result.extraction.values)) {
            if (k === 'bifacial') {
              if (!typed.bifacial) next.bifacial = val === 'on'
            } else if (next[k] == null || next[k] === '') {
              next[k] = val
            }
          }
          return { ...next, datasheet_url: result.pdfUrl }
        })
        setFormKey(k => k + 1)
      }
    })
  }

  return (
    <form ref={formRef} action={action} autoComplete="off" className="space-y-3">
      <div>
        <label className="block text-xs text-zon-muted">
          Datasheet you are reading from — the manufacturer&apos;s own document, not a shop&apos;s spec table
          <input
            key={`url-${formKey}`}
            ref={urlRef}
            name="datasheet_url"
            type="url"
            required
            autoComplete="off"
            defaultValue={(values.datasheet_url as string) ?? datasheetUrl ?? ''}
            className={`${input} mt-0.5 border-zon-rule`}
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={readSheet}
            disabled={reading}
            className="text-xs border border-zon-rule rounded px-3 py-1.5 bg-zon-paper hover:bg-zon-rule-soft disabled:opacity-50"
          >
            {reading ? 'Reading the datasheet… (up to a minute)' : 'Read from datasheet'}
          </button>
          <span className="text-xs text-zon-muted">Fills the empty fields below for you to check. Nothing is verified until you click Verify.</span>
        </div>
        {readError && <p className="mt-2 text-sm text-red-700">Couldn&apos;t read it: {readError}</p>}
        {read && (
          <div className={`mt-2 text-sm rounded px-3 py-2 border ${read.found ? 'bg-zon-gold-tint border-zon-gold/40' : 'bg-zon-red-tint border-zon-red/30'}`}>
            {read.found ? (
              <p>
                Filled {Object.keys(read.values).length} field{Object.keys(read.values).length === 1 ? '' : 's'} from the column headed{' '}
                <strong>{read.column ?? '(not stated)'}</strong>. <strong>Check that is this product&apos;s column</strong>, then check each
                gold field against the PDF — the label it was read from is under it.
              </p>
            ) : (
              <p className="font-medium">This datasheet doesn&apos;t seem to cover this model — nothing was filled.</p>
            )}
            {read.problems.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs">{read.problems.map(p => <li key={p}>{p}</li>)}</ul>
            )}
          </div>
        )}
      </div>

      {category === 'inverter' && (
        <label className="block text-xs text-zon-muted max-w-xs">
          Kind of unit
          <select
            key={`kind-${formKey}`}
            name="kind"
            defaultValue={(values.kind as string) ?? ''}
            onChange={() => markEdited('kind')}
            className={fieldClass('kind')}
          >
            <option value="">Choose…</option>
            <option value="hybrid">All-in-one hybrid (inverter + MPPT + charger)</option>
            <option value="inverter-only">Inverter only (no solar input)</option>
            <option value="charge-controller">Charge controller only</option>
          </select>
        </label>
      )}

      <div key={formKey} className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
        {fields.map(f => (
          <label key={f.name} className="block text-xs text-zon-muted">
            {f.label}{f.required && <span className="text-zon-ink"> *</span>}
            <input
              name={f.name}
              inputMode="decimal"
              autoComplete="off"
              defaultValue={values[f.name] == null ? '' : String(values[f.name])}
              onChange={() => markEdited(f.name)}
              className={fieldClass(f.name)}
            />
            {filledFrom(f.name) && <span className="block text-[11px] text-zon-body mt-0.5">↳ {filledFrom(f.name)}</span>}
          </label>
        ))}
        {category === 'panel' && (
          <>
            <label className="block text-xs text-zon-muted">
              Cell type
              <input
                name="cell_type"
                autoComplete="off"
                defaultValue={(values.cell_type as string) ?? ''}
                onChange={() => markEdited('cell_type')}
                className={fieldClass('cell_type')}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-zon-muted pt-4">
              <input key={`bifacial-${formKey}`} name="bifacial" type="checkbox" defaultChecked={values.bifacial === true} />
              Bifacial
            </label>
          </>
        )}
      </div>

      {state.errors.length > 0 && (
        <ul className="text-sm space-y-1 bg-zon-red-tint border border-zon-red/30 rounded px-3 py-2">
          <li className="font-medium text-zon-ink">Not verified — nothing was saved:</li>
          {state.errors.map(e => <li key={e} className="text-red-700">{e}</li>)}
        </ul>
      )}
      {state.status === 'ok' && (
        <p className="text-sm text-green-700">✓ Verified. It can now be published.</p>
      )}
      {state.flags.filter(f => f.severity === 'warn').length > 0 && (
        <ul className="text-xs space-y-1">
          {state.flags.filter(f => f.severity === 'warn').map(f => (
            <li key={f.code} className={SEVERITY_TEXT.warn}>Worth a second look: {f.message}</li>
          ))}
        </ul>
      )}

      <button
        disabled={pending || reading}
        className="text-sm bg-zon-gold hover:bg-zon-gold-deep text-zon-ink rounded px-4 py-1.5 disabled:opacity-50"
      >
        {pending ? 'Checking…' : 'Verify from datasheet'}
      </button>
    </form>
  )
}
