import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProtectionView } from '@/lib/calc-register'

/**
 * Chrome for a protection-register output.
 *
 * Cannot take a single verdict as its headline. The options that pass are
 * the heading; the arithmetic and the cited source sit underneath. Capacity
 * outputs do not use this component — they stay confident bands.
 */
export function RegisterBadge({ register }: { register: 'capacity' | 'protection' }) {
  if (register === 'capacity') {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wide text-zon-muted">
        Sizing
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide text-zon-amber">
      Protection
    </span>
  )
}

export default function ProtectionOutput({
  view,
  children,
}: {
  view: ProtectionView
  children?: React.ReactNode
}) {
  const passing = view.options.length > 0

  return (
    <Card className={passing ? 'border-zon-gold-light' : 'border-zon-red'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base text-zon-ink">{view.title}</CardTitle>
          <RegisterBadge register="protection" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {passing ? (
          <div>
            <p className="text-xs text-zon-muted uppercase tracking-wide mb-1">
              What passes
            </p>
            <p className="text-xl font-semibold text-zon-ink font-mono">
              {view.options.join(' · ')}
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <AlertTriangle className="w-5 h-5 text-zon-red shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-zon-body">{view.empty}</p>
          </div>
        )}

        {view.steps.length > 0 && (
          <div className="border-t border-zon-rule pt-3 space-y-3 text-xs text-zon-body">
            {view.steps.map((step, i) => (
              <div key={step.title}>
                <p className="font-semibold text-zon-ink mb-1">
                  {i + 1} · {step.title}
                </p>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        )}

        {children}

        <div className="border-t border-zon-rule pt-3 text-xs text-zon-muted space-y-1">
          {view.sources.map(src => (
            <p key={src}>{src}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
