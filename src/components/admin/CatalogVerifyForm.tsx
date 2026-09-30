'use client'

import { useActionState } from 'react'
import { verifySpecs, type VerifyState } from '@/app/admin/catalog/actions'
import { INVERTER_FIELDS, PANEL_FIELDS } from '@/lib/catalog-view'

// Raw Tailwind for state text, for the reason given in admin/batteries/page.tsx:
// --zon-red/amber/green fall below 4.5:1 at 12-14px on paper.
const SEVERITY_TEXT = { fail: 'text-red-700', warn: 'text-amber-700', ok: 'text-green-700' } as const

/**
 * Specs typed in from the manufacturer's datasheet.
 *
 * `initial` pre-fills the form ONLY with values that are safe to pre-fill:
 * figures a human already verified (re-verifying after a correction), and the
 * shop's physical fields. It never carries CEC electricals — a form that opens
 * full of CEC numbers is one click away from "verified" meaning "CEC", which
 * is the exact substitution the admission gate exists to refuse.
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
  const fields = category === 'panel' ? PANEL_FIELDS : INVERTER_FIELDS
  const input = 'appearance-none w-full text-sm border border-zon-rule rounded px-2 py-1 bg-zon-paper'

  return (
    <form action={action} className="space-y-3">
      <label className="block text-xs text-zon-muted">
        Datasheet you are reading from — the manufacturer&apos;s own document, not a shop&apos;s spec table
        <input name="datasheet_url" type="url" required defaultValue={datasheetUrl ?? ''} className={`${input} mt-0.5`} />
      </label>

      {category === 'inverter' && (
        <label className="block text-xs text-zon-muted max-w-xs">
          Kind of unit
          <select name="kind" defaultValue={(initial.kind as string) ?? ''} className={`${input} mt-0.5`}>
            <option value="">Choose…</option>
            <option value="hybrid">All-in-one hybrid (inverter + MPPT + charger)</option>
            <option value="inverter-only">Inverter only (no solar input)</option>
            <option value="charge-controller">Charge controller only</option>
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
        {fields.map(f => (
          <label key={f.name} className="block text-xs text-zon-muted">
            {f.label}{f.required && <span className="text-zon-ink"> *</span>}
            <input
              name={f.name}
              inputMode="decimal"
              defaultValue={initial[f.name] == null ? '' : String(initial[f.name])}
              className={`${input} mt-0.5`}
            />
          </label>
        ))}
        {category === 'panel' && (
          <>
            <label className="block text-xs text-zon-muted">
              Cell type
              <input name="cell_type" defaultValue={(initial.cell_type as string) ?? ''} className={`${input} mt-0.5`} />
            </label>
            <label className="flex items-center gap-2 text-xs text-zon-muted pt-4">
              <input name="bifacial" type="checkbox" defaultChecked={initial.bifacial === true} />
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
        disabled={pending}
        className="text-sm bg-zon-gold hover:bg-zon-gold-deep text-zon-ink rounded px-4 py-1.5 disabled:opacity-50"
      >
        {pending ? 'Checking…' : 'Verify from datasheet'}
      </button>
    </form>
  )
}
