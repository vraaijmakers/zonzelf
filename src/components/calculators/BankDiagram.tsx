import type { BankRow } from '@/lib/commissioning'
import type { InverterPort } from '@/lib/cheat-sheet'

/**
 * The battery bank drawn the way it stands in the rack: inverter on the left,
 * packs stacked on the right, one gold cable to the master and the link
 * cables running pack to pack.
 *
 * It draws from BankRow sockets, so the socket labels are the preset's panel
 * labels and nothing here knows it is a Sun Gold pack. Sockets that stay
 * empty are drawn dashed on purpose — "leave it empty" is the instruction
 * people go looking for.
 */

const PACK_H = 78
const GAP = 22
const TOP = 40
const PACK_X = 290
const PACK_W = 410
const SOCK_W = 32
const SOCK_H = 22
const SOCK_Y = 38
/** Beyond this the drawing stops being readable on paper; the table still covers every pack. */
export const DIAGRAM_MAX_PACKS = 8

export default function BankDiagram({
  bank,
  ports,
}: {
  bank: BankRow[]
  ports: InverterPort[]
}) {
  const rows = bank.slice(0, DIAGRAM_MAX_PACKS)
  if (rows.length === 0) return null
  const sockets = rows[0].sockets.map(s => s.label)
  // Group the inverter-facing sockets and the link sockets as the double
  // sockets they are on the panel: a gap after the first group.
  const upCount = rows[0].sockets.filter(s => s.kind === 'upstream').length
  const sockX = (i: number) => 470 + i * 40 + (i >= upCount ? 20 : 0)
  const height = TOP + rows.length * (PACK_H + GAP) + 10
  const invH = Math.max(250, 96 + ports.length * 34 + 30)
  const thisPort = Math.max(0, ports.findIndex(p => p.use === 'this'))
  const portY = (i: number) => 96 + i * 34
  const lead = rows[0].sockets.findIndex(s => s.to.startsWith('inverter'))

  return (
    <svg
      viewBox={`0 0 840 ${Math.max(height, invH + 60)}`}
      className="mx-auto h-auto w-full min-w-[640px] print:max-h-[3.2in] print:w-auto print:min-w-0"
      role="img"
      aria-label={`Wiring diagram: the inverter's ${ports[thisPort]?.name} port to pack 1's ${rows[0].sockets[lead]?.label} socket, then pack to pack.`}
    >
      {/* Inverter */}
      <rect x={16} y={40} width={190} height={invH} className="fill-zon-cream stroke-zon-ink" strokeWidth={1.5} />
      <text x={30} y={66} fontSize={17} fontWeight={700} className="fill-zon-ink">Inverter</text>
      <text x={30} y={82} fontSize={10} className="fill-zon-muted">comms ports</text>
      {ports.map((p, i) => (
        <g key={p.name}>
          <rect
            x={30} y={portY(i)} width={162} height={26}
            className={
              p.use === 'this' ? 'fill-zon-gold-tint stroke-zon-gold-deep'
                : p.use === 'not' ? 'fill-zon-amber-tint stroke-zon-amber'
                  : 'fill-zon-paper stroke-zon-rule'
            }
            strokeWidth={p.use === 'this' ? 2 : 1}
          />
          <text x={40} y={portY(i) + 17} fontSize={11} fontWeight={p.use === 'this' ? 600 : 400} className="fill-zon-ink font-mono">{p.name}</text>
          {p.use !== 'other' && (
            <text
              x={184} y={portY(i) + 17} fontSize={10} textAnchor="end" fontWeight={600}
              className={p.use === 'this' ? 'fill-zon-gold-deep' : 'fill-zon-amber'}
            >
              {p.use === 'this' ? 'THIS ONE' : 'NOT this'}
            </text>
          )}
        </g>
      ))}

      {/* Cable 1: inverter port → master's lead socket, routed above the rack. */}
      {lead >= 0 && (
        <>
          <path
            d={`M192 ${portY(thisPort) + 13} H244 V22 H${sockX(lead) + SOCK_W / 2} V${TOP + SOCK_Y}`}
            fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
            className="stroke-zon-gold-deep"
          />
          <text x={260} y={16} fontSize={11} fontWeight={600} className="fill-zon-gold-deep font-mono">
            CABLE 1 · straight patch cable to the inverter
          </text>
        </>
      )}

      {rows.map((row, p) => {
        const y = TOP + p * (PACK_H + GAP)
        const next = rows[p + 1]
        const outIdx = row.sockets.findIndex(s => next && s.to.startsWith(`pack ${next.pack}`))
        const inIdx = next ? next.sockets.findIndex(s => s.to.startsWith(`pack ${row.pack}`)) : -1
        return (
          <g key={row.pack}>
            <rect x={PACK_X} y={y} width={PACK_W} height={PACK_H} className="fill-zon-cream stroke-zon-ink" strokeWidth={1.5} />
            <text x={PACK_X + 14} y={y + 30} fontSize={20} fontWeight={700} className="fill-zon-ink">PACK {row.pack}</text>
            <text
              x={PACK_X + 14} y={y + 48} fontSize={11} fontWeight={600}
              className={row.role === 'master' ? 'fill-zon-gold-deep font-mono' : 'fill-zon-muted font-mono'}
            >
              {row.role === 'master' ? `MASTER · addr ${row.address}` : `address ${row.address}`}
            </text>
            {row.dip.map((s, d) => (
              <g key={d}>
                <rect x={PACK_X + 14 + d * 13} y={y + 56} width={11} height={16} className="fill-zon-paper stroke-zon-muted" strokeWidth={1} />
                <rect
                  x={PACK_X + 16 + d * 13} y={s === 'ON' ? y + 58 : y + 64} width={7} height={6}
                  className={s === 'ON' ? 'fill-zon-ink' : 'fill-zon-rule'}
                />
              </g>
            ))}
            {/* Double-socket frames, as on the panel. */}
            <rect x={sockX(0) - 4} y={y + SOCK_Y - 14} width={upCount * 40 - 4} height={SOCK_H + 18} fill="none" className="stroke-zon-muted" strokeWidth={1} />
            <rect x={sockX(upCount) - 4} y={y + SOCK_Y - 14} width={(sockets.length - upCount) * 40 - 4} height={SOCK_H + 18} fill="none" className="stroke-zon-muted" strokeWidth={1} />
            {row.sockets.map((s, i) => (
              <g key={s.label}>
                <text x={sockX(i) + SOCK_W / 2} y={y + SOCK_Y - 4} fontSize={8} textAnchor="middle" className="fill-zon-muted font-mono">{s.label}</text>
                <rect
                  x={sockX(i)} y={y + SOCK_Y} width={SOCK_W} height={SOCK_H}
                  className={
                    s.to.startsWith('inverter') ? 'fill-zon-gold stroke-zon-ink'
                      : s.to.startsWith('pack') ? 'fill-zon-night-soft stroke-zon-ink'
                        : 'fill-zon-paper stroke-zon-muted'
                  }
                  strokeWidth={1}
                  strokeDasharray={s.to.startsWith('empty') ? '3 2' : undefined}
                />
              </g>
            ))}
            {next && outIdx >= 0 && inIdx >= 0 && (() => {
              const x1 = sockX(outIdx) + SOCK_W / 2
              const x2 = sockX(inIdx) + SOCK_W / 2
              const y1 = y + SOCK_Y + SOCK_H
              const y2 = y + PACK_H + GAP + SOCK_Y
              return (
                <>
                  <path
                    d={`M${x1} ${y1} C${x1} ${y1 + 30} ${x2} ${y2 - 30} ${x2} ${y2}`}
                    fill="none" strokeWidth={3} strokeLinecap="round" className="stroke-zon-night-soft"
                  />
                  <text x={PACK_X + PACK_W + 10} y={y + PACK_H + GAP / 2 + 4} fontSize={11} fontWeight={600} className="fill-zon-night-soft font-mono">
                    CABLE {row.pack + 1}
                  </text>
                </>
              )
            })()}
          </g>
        )
      })}
    </svg>
  )
}

