'use client'

import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import BankDiagram, { DIAGRAM_MAX_PACKS } from '@/components/calculators/BankDiagram'
import { useBatterySummary, useInverterSummary, usePersistentState, useArraySummary } from '@/lib/calc-storage'
import { commissioningMap, commissioningPairing, parallelCountFor } from '@/lib/commissioning'
import { cheatSheet, type CheatSheet } from '@/lib/cheat-sheet'

/**
 * The printable field sheet for the System step.
 *
 * Three sheets, each starting on a new page when printed: what plugs into
 * what; the order of work and the checks; the WiFi module. It reads the same
 * saved steps as /calculators/system and builds from the same commissioning
 * map, so paper and screen cannot disagree.
 */
export default function CheatSheetView() {
  const battery = useBatterySummary()
  const inverter = useInverterSummary()
  const array = useArraySummary()
  const [generatorKw, , { hydrated }] = usePersistentState<number | null>('zonzelf:system:generatorKw', null)

  // Saved steps live in localStorage, which the server render cannot see.
  // Without this the page flashes "no cheat sheet" before storage is read.
  if (!hydrated) {
    return <p className="mx-auto max-w-2xl px-4 py-12 text-sm text-zon-muted">Reading your saved steps…</p>
  }

  const pair = commissioningPairing(
    inverter ? { id: inverter.id, brand: inverter.brand, model: inverter.model } : undefined,
    battery?.presetId,
  )
  if (!pair) return <NotAvailable />

  const n = parallelCountFor(battery?.bankKwh, pair.battery)
  const map = commissioningMap(pair, {
    parallelCount: n,
    generatorKw: generatorKw ?? undefined,
    array: array ?? undefined,
  })
  const sheet = cheatSheet(pair, map, n)
  const sheets = sheet.monitoring ? 4 : 3

  return (
    <div className="cheat-sheet mx-auto max-w-4xl space-y-10 px-4 py-8 text-sm text-zon-body print:max-w-none print:space-y-0 print:p-0 print:text-[11px]">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/calculators/system" className="inline-flex items-center gap-1 text-zon-gold-deep hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the System step
        </Link>
        <Button onClick={() => window.print()} data-umami-event="cheat-sheet-print">
          <Printer className="h-4 w-4" aria-hidden="true" /> Print cheat sheet
        </Button>
      </div>

      <WiringSheet sheet={sheet} of={sheets} />
      <OrderSheet sheet={sheet} of={sheets} />
      <SettingsSheet sheet={sheet} of={sheets} />
      {sheet.monitoring && <WifiSheet sheet={sheet} of={sheets} />}
    </div>
  )
}

function SheetHeader({ title, n, of, sub }: { title: string; n: number; of: number; sub: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b-[3px] border-zon-ink pb-2">
      <h1 className="text-2xl font-bold leading-tight text-zon-ink text-balance">{title}</h1>
      <p className="font-mono text-xs text-zon-muted sm:text-right">
        Sheet {n} of {of}
        <br />
        {sub}
      </p>
    </header>
  )
}

function Rules({ rules }: { rules: { title: string; body: string; tone?: 'gold' | 'plain' | 'stop' }[] }) {
  const edge = { gold: 'border-zon-gold', plain: 'border-zon-ink', stop: 'border-zon-red' }
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      {rules.map(r => (
        <div key={r.title} className={`min-w-0 border-l-4 bg-zon-cream px-3 py-2 ${edge[r.tone ?? 'plain']}`}>
          <p className="font-semibold text-zon-ink">{r.title}</p>
          <p>{r.body}</p>
        </div>
      ))}
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zon-ink">{children}</h2>
}

function Sheet({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return <section className={`space-y-5 ${first ? '' : 'print:break-before-page'}`}>{children}</section>
}

/* ── Sheet 1 ───────────────────────────────────────────────────────────── */

function WiringSheet({ sheet, of }: { sheet: CheatSheet; of: number }) {
  const unknown = sheet.packCount === undefined
  return (
    <Sheet first>
      <SheetHeader
        title={`Battery bank comms: ${sheet.title}`}
        n={1} of={of}
        sub={`what plugs into what · route: ${sheet.upstreamSocket}`}
      />
      <Rules rules={sheet.rules} />

      {unknown ? (
        <Card>
          <CardContent className="pt-4">
            The bank size is not saved yet, so there is no per-pack table.{' '}
            <Link href="/calculators/battery" className="text-zon-gold-deep hover:underline">
              Set the bank on the battery step
            </Link>{' '}
            and this sheet fills in each pack&apos;s address and cables.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <BankDiagram bank={sheet.bank} ports={sheet.inverterPorts} />
          </div>
          {sheet.bank.length > DIAGRAM_MAX_PACKS && (
            <p className="text-xs text-zon-muted">
              The drawing shows the first {DIAGRAM_MAX_PACKS} packs. The table covers all {sheet.bank.length}.
            </p>
          )}
          <BankTable sheet={sheet} />
        </>
      )}

      <Card className="break-inside-avoid print:py-2">
        <CardContent className="space-y-2 pt-4 print:pt-1">
          <H2>Cables to bring</H2>
          <Checklist items={sheet.cables} />
        </CardContent>
      </Card>
    </Sheet>
  )
}

function BankTable({ sheet }: { sheet: CheatSheet }) {
  const labels = sheet.bank[0].sockets.map(s => s.label)
  return (
    <div className="overflow-x-auto">
      <table className="w-full tabular-nums">
        <caption className="sr-only">Address, DIP switches and cables for each pack</caption>
        <thead>
          <tr className="border-b-2 border-zon-ink text-left text-xs uppercase tracking-wide text-zon-muted">
            <th scope="col" className="py-1.5 pr-3 font-medium">Pack</th>
            <th scope="col" className="py-1.5 pr-3 font-medium">Addr</th>
            <th scope="col" className="py-1.5 pr-3 font-medium whitespace-nowrap">DIP #1 → #{sheet.bank[0].dip.length}</th>
            {labels.map(l => (
              <th key={l} scope="col" className="py-1.5 pr-3 font-mono font-medium">{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.bank.map(row => (
            <tr key={row.pack} className="border-b border-zon-rule align-top">
              <td className="py-1.5 pr-3 text-lg font-bold text-zon-ink print:py-1 print:text-sm">
                {row.pack}
                {row.role === 'master' && (
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-zon-gold-deep">master</span>
                )}
              </td>
              <td className="py-1.5 pr-3 font-mono text-lg font-semibold text-zon-ink print:py-1 print:text-sm">{row.address}</td>
              <td className="py-1.5 pr-3 print:py-1">
                <span className="inline-flex gap-0.5" aria-label={row.dip.join(', ')}>
                  {row.dip.map((s, i) => (
                    <span key={i} className="relative inline-block h-4 w-3 border border-zon-muted bg-zon-paper">
                      <span className={`absolute inset-x-0.5 h-1.5 ${s === 'ON' ? 'top-0.5 bg-zon-ink' : 'bottom-0.5 bg-zon-rule'}`} />
                    </span>
                  ))}
                </span>
                <span className="block whitespace-nowrap font-mono text-[11px] text-zon-muted">
                  {row.dip.flatMap((s, i) => (s === 'ON' ? [`#${i + 1}`] : [])).join(' + ') || 'all'} {row.dip.includes('ON') ? 'ON' : 'OFF'}
                </span>
              </td>
              {row.sockets.map(s => (
                <td
                  key={s.label}
                  className={`py-1.5 pr-3 print:py-1 ${
                    s.to.startsWith('inverter') ? 'bg-zon-gold-tint font-semibold text-zon-ink'
                      : s.to.startsWith('empty') ? 'text-zon-muted' : ''
                  }`}
                >
                  {s.to.startsWith('pack') ? `→ ${s.to}` : s.to.startsWith('inverter') ? `→ ${s.to}` : s.to}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-zon-muted">
        DIP glyph: switch #1 on the left, dark = ON. Check the switch body — the printed numbers and ON marking win over this drawing.
      </p>
    </div>
  )
}

/* ── Sheet 2 ───────────────────────────────────────────────────────────── */

function OrderSheet({ sheet, of }: { sheet: CheatSheet; of: number }) {
  return (
    <Sheet>
      <SheetHeader title="Order of work and checks" n={2} of={of} sub={`${sheet.inverterModel} + ${sheet.batteryModel}`} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="min-w-0">
          <H2>Do it in this order</H2>
          <Steps items={sheet.order} />
        </div>
        <div className="min-w-0 space-y-5">
          <div>
            <H2>It worked if</H2>
            <Checklist items={sheet.checks} />
          </div>
          <div>
            <H2>If you see</H2>
            <dl className="space-y-2">
              {sheet.faults.map(f => (
                <div key={f.code} className="break-inside-avoid">
                  <dt>
                    <span className="bg-zon-cream px-1 font-mono font-semibold text-zon-ink">{f.code}</span>{' '}
                    <span className="font-semibold text-zon-ink">{f.name}</span>
                    <span className="text-zon-muted"> — {f.meaning}</span>
                  </dt>
                  <dd>{f.here}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card className="break-inside-avoid">
          <CardContent className="space-y-2 pt-4">
            <H2>Pins: why a plain cable works</H2>
            <div className="grid gap-3 sm:grid-cols-2">
              {sheet.pins.map(t => (
                <div key={t.title} className="min-w-0">
                  <p className="text-xs font-semibold text-zon-ink">{t.title}</p>
                  <table className="mt-1 w-full text-xs">
                    <tbody>
                      {t.rows.map(r => (
                        <tr key={r.signal}>
                          <td className="pr-2">{r.signal}</td>
                          <td className="text-right font-mono text-zon-ink">{r.pins}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {sheet.planB && (
          <Card className="break-inside-avoid">
            <CardContent className="space-y-2 pt-4">
              <H2>Plan B: the other bus</H2>
              <p>{sheet.planB}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="break-inside-avoid">
        <H2>Notes on site</H2>
        <WriteLines count={4} />
      </div>
      <Sources items={sheet.sources} />
    </Sheet>
  )
}

/* ── Sheet 3 ───────────────────────────────────────────────────────────── */

function SettingsSheet({ sheet, of }: { sheet: CheatSheet; of: number }) {
  return (
    <Sheet>
      <SheetHeader title="Inverter LCD settings" n={3} of={of} sub={`${sheet.inverterModel} + ${sheet.batteryModel}`} />
      <div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Inverter LCD settings, with the reason for each value</caption>
            <thead>
              <tr className="border-b-2 border-zon-ink text-left text-xs uppercase tracking-wide text-zon-muted">
                <th scope="col" className="py-1.5 pr-3 font-medium">Item</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Setting</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Set to</th>
                <th scope="col" className="py-1.5 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {sheet.settings.map(r => (
                <tr key={r.item} className="border-b border-zon-rule align-top">
                  <td className="py-1.5 pr-3 font-mono text-zon-ink">[{r.item}]</td>
                  <td className="py-1.5 pr-3">
                    {r.name}
                    {r.standbyOnly && <span className="block text-[10px] font-semibold text-zon-amber">rocker off</span>}
                  </td>
                  <td className="py-1.5 pr-3 font-mono font-semibold text-zon-ink">
                    {r.item === '01' ? (
                      <span className="inline-block min-w-16 border-b border-zon-muted">&nbsp;</span>
                    ) : r.value}
                  </td>
                  <td className="py-1.5 text-xs">
                    {r.item === '01'
                      ? `Your choice: ${sheet.workModes.map(m => `${m.id} (${m.label})`).join(', ')}. Pick it on the System step and write it in.`
                      : r.why}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] text-zon-muted">
          Charge-current items (07, 28) show their working on the System step. These values assume the bank size and generator you saved there.
        </p>
      </div>

      <Sources items={sheet.sources} />
    </Sheet>
  )
}

/* ── Sheet 4 ───────────────────────────────────────────────────────────── */

function WifiSheet({ sheet, of }: { sheet: CheatSheet; of: number }) {
  const m = sheet.monitoring!
  return (
    <Sheet>
      <SheetHeader title="WiFi monitoring module" n={4} of={of} sub="optional · after sheet 2 passes" />
      <Rules rules={m.rules.map((r, i) => ({ ...r, tone: (['gold', 'plain', 'stop'] as const)[i] ?? 'plain' }))} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <div>
            <H2>First: which module do you have?</H2>
            <p>The app depends on the module, not the inverter. Read the label on the stick or its box.</p>
            <table className="mt-2 w-full text-xs">
              <caption className="sr-only">Module label and the app it uses</caption>
              <thead>
                <tr className="border-b-2 border-zon-ink text-left uppercase tracking-wide text-zon-muted">
                  <th scope="col" className="py-1 pr-3 font-medium">Label says</th>
                  <th scope="col" className="py-1 font-medium">App</th>
                </tr>
              </thead>
              <tbody>
                {m.apps.map(a => (
                  <tr key={a.label} className="border-b border-zon-rule align-top">
                    <td className="py-1 pr-3 font-semibold text-zon-ink">{a.label}</td>
                    <td className="py-1">{a.app}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <H2>Before you leave home</H2>
            <Checklist items={m.before} />
          </div>
        </div>
        <div className="min-w-0">
          <H2>Setup ({m.stepsFor})</H2>
          <Steps items={m.steps} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="min-w-0">
          <H2>If it won&apos;t work</H2>
          <dl className="space-y-2">
            {m.trouble.map(t => (
              <div key={t.problem} className="break-inside-avoid">
                <dt className="font-semibold text-zon-ink">{t.problem}</dt>
                <dd>{t.fix}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Card className="break-inside-avoid">
          <CardContent className="space-y-3 pt-4">
            <H2>Write it down</H2>
            {m.writeDown.map(w => (
              <div key={w} className="flex items-end gap-3">
                <span className="shrink-0 text-xs">{w}</span>
                <span className="h-5 flex-1 border-b border-zon-rule" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Sources items={m.sources} />
    </Sheet>
  )
}

/* ── Small parts ───────────────────────────────────────────────────────── */

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 break-inside-avoid">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center border-[1.5px] border-zon-ink text-xs font-bold text-zon-ink" aria-hidden="true">
            {i + 1}
          </span>
          <span className="min-w-0">{s}</span>
        </li>
      ))}
    </ol>
  )
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((c, i) => (
        <li key={i} className="flex gap-2 break-inside-avoid">
          <span className="mt-0.5 h-3.5 w-3.5 shrink-0 border-[1.5px] border-zon-ink" aria-hidden="true" />
          <span className="min-w-0">{c}</span>
        </li>
      ))}
    </ul>
  )
}

function WriteLines({ count }: { count: number }) {
  return (
    <div className="space-y-5 pt-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <div key={i} className="border-b border-zon-rule" />)}
    </div>
  )
}

function Sources({ items }: { items: string[] }) {
  return (
    <p className="border-t border-zon-rule pt-2 text-[11px] text-zon-muted">
      Sources: {items.join(' · ')}. Built by ZonZelf from your saved System step — check the values against your own manuals.
    </p>
  )
}

function NotAvailable() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardContent className="space-y-3 pt-4 text-sm text-zon-body">
          <h1 className="text-lg font-semibold text-zon-ink">No cheat sheet for this equipment yet</h1>
          <p>
            A cheat sheet prints menu numbers and socket labels, so we only make one for a pairing
            whose manuals we have actually read: a Sun Gold SPH8048P or SPH10048P with SG48100P
            packs. Pick those on the inverter and battery steps, then come back.
          </p>
          <Link href="/calculators/system" className="inline-flex items-center gap-1 text-zon-gold-deep hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the System step
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
