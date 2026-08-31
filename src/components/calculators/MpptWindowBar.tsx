/**
 * The MPPT window, drawn.
 *
 * This is the one picture that makes string design click, so it is worth
 * getting right: a voltage scale with the tracker's own thresholds marked on
 * it, and the string's two real voltages placed against them.
 *
 * FORM. Not a chart of a dataset — a linear gauge against fixed thresholds,
 * which is the status job. So it uses the reserved status palette (green =
 * works, amber = attention, red = fault) exactly as CLAUDE.md requires, and
 * never decoratively. The zones are labelled in words as well as colour, and
 * the two markers are directly labelled, so nothing here is carried by colour
 * alone.
 *
 * TEXT WEARS TEXT TOKENS. --zon-green and friends are state fills at oklch
 * lightness 0.72-0.77; they fail contrast as text on paper (there is already a
 * comment about this on the panels page). Every label is an ink token sitting
 * on a tint, never coloured text.
 *
 * HTML AND CSS RATHER THAN SVG. The scale is linear and the labels are prose,
 * so percentage positioning gets responsive behaviour for free and keeps the
 * text at real font sizes instead of scaling with a viewBox — which is what
 * would happen to an SVG stretched across a column.
 */

interface Zone {
  from: number
  to: number
  label: string
  className: string
}

export interface WindowMarker {
  /** Voltage to place on the scale. */
  volts: number
  label: string
  /** One line on what this voltage is and when it happens. */
  detail: string
  tone: 'ok' | 'warn' | 'bad'
}

export default function MpptWindowBar({
  mpptMinV,
  mpptMaxV,
  pvMaxInputV,
  markers,
}: {
  mpptMinV: number
  mpptMaxV: number
  pvMaxInputV: number
  markers: WindowMarker[]
}) {
  // Leave room past the damage ceiling so an over-limit string is visible
  // sitting outside it, rather than pinned to the end pretending to be inside.
  const highest = Math.max(pvMaxInputV, ...markers.map(m => m.volts))
  const scaleMax = Math.max(pvMaxInputV * 1.12, highest * 1.06, 1)
  const pct = (v: number) => Math.max(0, Math.min(100, (v / scaleMax) * 100))

  const zones: Zone[] = [
    {
      from: 0, to: mpptMinV,
      label: 'Too low to track',
      // Deliberately neutral, not red: nothing is damaged down here, there is
      // simply no harvest. The register split, drawn.
      className: 'bg-zon-rule-soft',
    },
    { from: mpptMinV, to: mpptMaxV, label: 'Working window', className: 'bg-zon-green-tint' },
    { from: mpptMaxV, to: pvMaxInputV, label: 'Clips, survives', className: 'bg-zon-amber-tint' },
    { from: pvMaxInputV, to: scaleMax, label: 'Destroys the unit', className: 'bg-zon-red-tint' },
  ].filter(z => z.to > z.from)

  // The damage ceiling is the one that must always be legible, so ticks are
  // chosen from the top down and a crowded neighbour is dropped rather than
  // overprinted.
  const MIN_TICK_GAP_PCT = 11
  const ticks = [pvMaxInputV, mpptMaxV, mpptMinV].reduce<{ v: number; label: string }[]>(
    (kept, v) => {
      if (kept.every(k => Math.abs(pct(k.v) - pct(v)) >= MIN_TICK_GAP_PCT)) {
        kept.push({ v, label: `${Math.round(v)}V` })
      }
      return kept
    },
    [],
  )

  return (
    <figure className="m-0">
      <div className="relative pb-9" style={{ paddingTop: `${markers.length * 26 + 6}px` }}>
        {/* Markers above the bar, directly labelled, and stacked on their own
            rows. A single row collided whenever the two voltages sat close
            together — which is precisely the case worth looking at. */}
        {markers.map((m, i) => {
          const left = pct(m.volts)
          // Each marker's stem reaches down to the bar from its own row.
          const stem = (markers.length - 1 - i) * 26 + 20
          return (
            <div
              key={m.label}
              className="absolute flex flex-col items-center"
              style={{
                top: `${i * 26}px`,
                left: `${left}%`,
                transform: `translateX(${left > 78 ? '-100%' : left < 22 ? '0' : '-50%'})`,
              }}
            >
              <span
                className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  m.tone === 'bad'
                    ? 'bg-zon-red-tint text-zon-ink'
                    : m.tone === 'warn'
                      ? 'bg-zon-amber-tint text-zon-ink'
                      : 'bg-zon-gold-tint text-zon-ink'
                }`}
              >
                {m.label} {Math.round(m.volts)}V
              </span>
              <span
                aria-hidden="true"
                className={`w-0.5 ${m.tone === 'bad' ? 'bg-zon-red' : 'bg-zon-ink'}`}
                style={{
                  height: `${stem}px`,
                  // The stem hangs from the label, which may be offset from the
                  // voltage; pin it back to the actual position.
                  marginLeft: left > 78 ? 'auto' : left < 22 ? '0' : undefined,
                  marginRight: left > 78 ? '0' : undefined,
                }}
              />
            </div>
          )
        })}

        {/* The bar. 2px surface gaps between zones, per the mark spec. */}
        <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded">
          {zones.map(z => (
            <div
              key={z.label}
              className={`${z.className} h-full`}
              style={{ width: `${pct(z.to) - pct(z.from)}%` }}
              title={z.label}
            />
          ))}
        </div>

        {/* Thresholds, recessive. */}
        {ticks.map(t => {
          const left = pct(t.v)
          return (
            <div
              key={t.label}
              className="absolute bottom-0 flex flex-col items-center"
              style={{
                left: `${left}%`,
                transform: `translateX(${left > 88 ? '-100%' : '-50%'})`,
              }}
            >
              <span aria-hidden="true" className="h-2 w-px bg-zon-rule" />
              <span className="whitespace-nowrap text-[10px] tabular-nums text-zon-muted">
                {t.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Identity in words, so nothing depends on colour. */}
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zon-muted">
        {zones.map(z => (
          <span key={z.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${z.className}`} />
            {z.label}
          </span>
        ))}
      </figcaption>

      {/* The same information as prose, for anyone who cannot use the picture. */}
      <p className="sr-only">
        The tracker works between {Math.round(mpptMinV)} and {Math.round(mpptMaxV)} volts, clips
        between {Math.round(mpptMaxV)} and {Math.round(pvMaxInputV)} volts, and is destroyed above{' '}
        {Math.round(pvMaxInputV)} volts.{' '}
        {markers.map(m => `${m.label} is ${Math.round(m.volts)} volts: ${m.detail}`).join(' ')}
      </p>
    </figure>
  )
}
