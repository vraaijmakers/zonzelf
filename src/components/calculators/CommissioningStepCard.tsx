import { AlertTriangle, Power } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ProtectionOutput from '@/components/ProtectionOutput'
import type { CommissioningStep } from '@/lib/commissioning'

/**
 * One numbered step of the commissioning procedure.
 *
 * The settings table is the part people came for, so it is a real table with
 * the menu item, the value, and why — not prose. Rows the manual marks
 * "turn off the rocker switch can be set" carry a marker, because finding
 * that out later means a power cycle.
 *
 * Protection outputs render in place, at the point in the sequence where they
 * apply, rather than as a separate wall of cards.
 */
export default function CommissioningStepCard({
  step,
  n,
  tone = 'normal',
  children,
}: {
  step: CommissioningStep
  n?: number
  tone?: 'normal' | 'fallback'
  children?: React.ReactNode
}) {
  const fallback = tone === 'fallback'
  return (
    <Card className={fallback ? 'border-zon-amber' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-baseline gap-2 text-base text-zon-ink">
          {n !== undefined && (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zon-gold text-xs font-semibold"
              aria-hidden="true"
            >
              {n}
            </span>
          )}
          <span>{step.title}</span>
        </CardTitle>
        <p className="text-sm text-zon-body">{step.purpose}</p>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {step.actions && (
          <ol className="space-y-2">
            {step.actions.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-zon-muted tabular-nums" aria-hidden="true">
                  {i + 1}.
                </span>
                <span className="text-zon-body">{a}</span>
              </li>
            ))}
          </ol>
        )}

        {step.pinouts && (
          <div className="grid gap-3 sm:grid-cols-3">
            {step.pinouts.map(t => (
              <div key={t.title} className="rounded-lg border border-zon-rule p-3">
                <p className="text-xs font-medium text-zon-ink">{t.title}</p>
                <table className="mt-2 w-full text-xs">
                  <tbody>
                    {t.rows.map(r => (
                      <tr key={r.signal}>
                        <td className="py-0.5 pr-2 text-zon-body">{r.signal}</td>
                        <td className="py-0.5 text-right font-mono text-zon-ink">{r.pins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[10px] text-zon-muted">{t.source}</p>
              </div>
            ))}
          </div>
        )}

        {step.settings && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Inverter LCD settings, with the reason for each value
              </caption>
              <thead>
                <tr className="border-b border-zon-rule text-left text-xs uppercase tracking-wide text-zon-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">Item</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Setting</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Set to</th>
                  <th scope="col" className="py-2 font-medium">Why</th>
                </tr>
              </thead>
              <tbody>
                {step.settings.map(row => (
                  <tr key={row.item} className="border-b border-zon-rule-soft align-top">
                    <td className="py-2 pr-3 font-mono text-zon-ink">[{row.item}]</td>
                    <td className="py-2 pr-3 text-zon-body">
                      {row.name}
                      {row.standbyOnly && (
                        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-zon-amber">
                          <Power className="h-3 w-3" aria-hidden="true" />
                          rocker switch off
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono font-semibold text-zon-ink">{row.value}</td>
                    <td className="py-2 text-zon-body">{row.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {step.checks && (
          <ul className="space-y-1.5">
            {step.checks.map((c, i) => (
              <li key={i} className="flex gap-2 text-zon-body">
                <span className="text-zon-gold-deep" aria-hidden="true">✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        )}

        {step.faults && (
          <div className="rounded-lg bg-zon-rule-soft p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zon-muted">
              If you see a fault code
            </p>
            <ul className="space-y-2">
              {step.faults.map(f => (
                <li key={f.code}>
                  <span className="font-mono font-semibold text-zon-ink">{f.code}</span>{' '}
                  <span className="font-medium text-zon-ink">{f.name}</span>{' '}
                  <span className="text-zon-muted">— {f.meaning}.</span>{' '}
                  <span className="text-zon-body">{f.here}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step.views?.map(view => (
          <ProtectionOutput key={view.id} view={view} />
        ))}

        {children}

        {step.note && (
          <div className="flex gap-2 rounded-lg bg-zon-cream p-3">
            <AlertTriangle
              className={`mt-0.5 h-4 w-4 shrink-0 ${fallback ? 'text-zon-amber' : 'text-zon-muted'}`}
              aria-hidden="true"
            />
            <p className="text-xs text-zon-body">{step.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
