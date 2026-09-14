'use client'

import { AlertTriangle, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { windowAround, type GranularityMap, type CountOption } from '@/lib/panel-granularity'
import type { TrackerSpec } from '@/lib/pv-string'

/**
 * Which panel COUNTS wire on this unit — the answer step 5 could never give,
 * because it only ever looked at one count at a time.
 *
 * Step 4 rounds up from an energy target. Step 5 has to factor that number
 * into whole strings. When the two disagree the page used to say "no
 * arrangement of 11 panels works" and stop, leaving the reader to guess
 * whether 10 or 12 or 20 was the way out — and the paragraph underneath told
 * them a bigger array on the same box was NOT one, which for the site's own
 * admitted pairing is untrue: eleven has no safe arrangement and twelve wires
 * cleanly.
 *
 * The teaching is in the table rather than in a rule. There is no parity law
 * here — seven wires and nine does not — so the honest thing is to show the
 * set and name what stops each count. panel-granularity.ts will report a
 * parity observation when one genuinely holds across the scan; it stays quiet
 * for this pairing, and so does this component.
 */
export default function CountGranularity({
  map,
  tracker,
  panelWatts,
}: {
  map: GranularityMap
  tracker: TrackerSpec
  panelWatts: number
}) {
  const target = map.target
  const shown = windowAround(map, target)
  if (shown.length === 0) return null

  const targetRow = target === null ? null : map.options.find(o => o.panels === target) ?? null
  const blocked = targetRow !== null && !targetRow.wirable
  const up = map.nearestAtOrAbove
  const down = map.nearestBelow

  const pct = (o: CountOption) =>
    o.ofTarget === null ? '' : `${o.ofTarget > 1 ? '+' : ''}${Math.round((o.ofTarget - 1) * 100)}%`

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zon-body">
          {target === null
            ? 'Panel counts that fit this inverter'
            : `Counts near the ${target} your energy target asked for`}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {blocked && (
          <p className="flex gap-2 border-b border-zon-rule bg-zon-amber-tint px-4 py-3 text-xs text-zon-body">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-zon-amber" aria-hidden="true" />
            <span>
              <strong className="text-zon-ink">
                {target} panels cannot be wired on this unit
              </strong>{' '}
              {/* "Buy one more panel" is the usual fix and was once said here
                  unconditionally — which contradicted the very next sentence
                  whenever nothing ABOVE the target wires. Going up is only
                  advice when going up actually works. */}
              {up !== null && down !== null ? (
                <>
                  — but a nearby count can.{' '}
                  <strong className="text-zon-ink">{down}</strong> works and leaves you short of
                  the energy target; <strong className="text-zon-ink">{up}</strong> works and
                  overshoots it. Either is a real build; {target} is not.
                </>
              ) : up !== null ? (
                <>
                  — but a nearby count can.{' '}
                  <strong className="text-zon-ink">{up}</strong> is the next count that works,
                  and buying the extra panel is usually the cheapest fix on this page.
                </>
              ) : down !== null ? (
                <>
                  — and neither can any larger count.{' '}
                  <strong className="text-zon-ink">{down}</strong> is the biggest that works on
                  this unit, so going up is not the way out here: buying more panels makes it
                  worse, not better. See the ceiling below.
                </>
              ) : (
                <>— and no count in this range wires on this unit at all.</>
              )}
            </span>
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">
              Panel counts around the energy target, whether each can be wired into whole
              strings within this inverter&apos;s limits, and what stops the ones that cannot
            </caption>
            <thead>
              <tr className="border-b border-zon-rule bg-zon-cream text-zon-muted">
                <th scope="col" className="px-4 py-2 text-left">Panels</th>
                <th scope="col" className="px-3 py-2 text-right">Array</th>
                {target !== null && (
                  <th scope="col" className="px-3 py-2 text-right">vs target</th>
                )}
                <th scope="col" className="px-3 py-2 text-right">Ways to wire</th>
                <th scope="col" className="px-4 py-2 text-left">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(o => {
                const isTarget = o.panels === target
                return (
                  <tr
                    key={o.panels}
                    className={`border-b border-zon-rule-soft ${isTarget ? 'bg-zon-gold-tint' : ''}`}
                  >
                    <td className="px-4 py-2 font-mono text-zon-ink">
                      {o.panels}
                      {isTarget && (
                        <span className="ml-2 font-sans text-zon-muted">target</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zon-body">
                      {(o.arrayW / 1000).toFixed(2)} kW
                    </td>
                    {target !== null && (
                      <td className="px-3 py-2 text-right tabular-nums text-zon-muted">
                        {pct(o)}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right tabular-nums text-zon-body">
                      {o.ways}
                    </td>
                    <td className="px-4 py-2 text-zon-body">
                      {o.wirable ? (
                        <span className="flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 shrink-0 text-zon-green" aria-hidden="true" />
                          <span className="font-mono text-zon-ink">
                            {o.best!.series}S{o.best!.parallel}P
                          </span>
                          {!o.clean && <span className="text-zon-muted">— works, with a caveat</span>}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <X className="h-3.5 w-3.5 shrink-0 text-zon-red" aria-hidden="true" />
                          <span>
                            {o.blockedBy === 'voltage'
                              ? `every arrangement passes the ${tracker.pvMaxInputV}V input`
                              : o.blockedBy === 'current'
                                ? `every arrangement passes the ${tracker.pvMaxIscA ?? tracker.pvMaxCurrentA}A tracker rating`
                                : o.blockedBy === 'window'
                                  ? `every arrangement sags under the ${tracker.mpptMinV}V floor when hot`
                                  : o.ways <= 2
                                    ? 'too tall one way, too wide the other'
                                    : 'each way hits a different limit'}
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 border-t border-zon-rule px-4 py-3 text-xs text-zon-muted">
          <p>
            <strong className="text-zon-body">
              A count can only be wired the ways it divides.
            </strong>{' '}
            The &ldquo;ways to wire&rdquo; column is that, and it is why the awkward counts are
            awkward: a prime number of panels divides only two ways — one tall string, or one
            wide row — so if the tall one passes your inverter&apos;s voltage limit and the wide
            one passes its current limit, there is nothing in between to fall back on. A count
            with more factors has more chances to fit the same box.
          </p>
          {map.ceiling !== null && map.ceiling < map.to && (
            <p>
              <strong className="text-zon-body">
                Above {map.ceiling} panels nothing fits on this unit
              </strong>{' '}
              — not a bigger arrangement, not more strings. That is{' '}
              {((map.ceiling * panelWatts) / 1000).toFixed(1)} kW of panel, and past it the
              answer is a second inverter or a different one, not more modules.
            </p>
          )}
          {map.parity !== null && (
            <p>
              Between {map.from} and {map.to} panels, only {map.parity} counts wire on this
              pairing. That is an observation about this range and this equipment, not a rule
              about solar.
            </p>
          )}
          <p>
            Sized on energy in step 4, wired in whole strings here. Neither step is wrong when
            they disagree — energy sizing does not know your inverter&apos;s voltage window, and
            the window does not know your daily kWh.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
