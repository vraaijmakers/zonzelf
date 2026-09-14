/**
 * The whole chain, seen at once — and the assumptions holding it up.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Six calculators each produce a confident number and none of them can see the
 * others. The roadmap item names the failure precisely: "four tools that each
 * look authoritative and quietly disagree is the worst configuration
 * available, because it has the confidence of a specification and the
 * coherence of a guess."
 *
 * That is not hypothetical. Panel sizing rounds UP to a whole panel count from
 * an energy target. Array wiring then has to factor that count into whole
 * strings that fit a voltage window and a current limit. For a real pairing —
 * the SG550WM against an SPH10048P at a -25.9 degC design low — EVERY ODD
 * COUNT fails: 9, 11, 13 and 15 panels have no safe arrangement at all, while
 * 10, 12, 14 and 16 do. The panel page will tell you to buy 11 and the array
 * page will tell you nothing fits, and neither page is wrong on its own terms.
 * Only a page that reads both can say so.
 *
 * WHAT THIS MODULE IS FOR
 * -----------------------
 * Three things the individual steps structurally cannot do:
 *
 *   1. DISAGREEMENTS. Where two steps have computed the same quantity and got
 *      different answers, or where one step's output does not fit another
 *      step's limit.
 *   2. ASSUMPTIONS, WITH PROVENANCE. Every figure that shapes the result,
 *      which step it was set on, whether it is still the shipped default, and
 *      what it changes downstream. This is the "this number depends on that
 *      assumption you made three steps ago" the item asks for.
 *   3. A CONFIDENCE BAND that is honest about being qualitative.
 *
 * WHY THE BAND IS NOT A PERCENTAGE
 * --------------------------------
 * It would be easy to print "+/- 23%" and it would be invented. A real
 * interval needs error distributions for peak sun at this site, this roof's
 * soiling, this panel's degradation and this household's behaviour, and none
 * of those exist here. What CAN be said honestly is which assumptions dominate,
 * how many are still at defaults nobody chose, and which way each errs. So the
 * band is a word — wide, moderate, narrow — with its reasons attached, and the
 * reasons are the useful part.
 *
 * ON "STILL AT THE DEFAULT"
 * -------------------------
 * A value equal to the shipped default is reported as "still at the default",
 * never as "you did not choose this". Somebody may have looked at 80% array
 * derate and decided it was right. The wording is true either way, and the
 * distinction matters because the whole point is to prompt a decision rather
 * than to accuse.
 */

import { CALC_STEPS, type StepId } from './calc-steps'
import { DEFAULTS as EFF } from './system-efficiency'
import { DEFAULT_CELL_RISE_C } from './pv-string'
import { normalizeBreakdown } from './appliance-load'
import { recommendedSystemVoltage } from './system-voltage'
import { formatTemp, formatDelta, DEFAULT_TEMP_UNIT, type TempUnit } from './temperature'
import type {
  LoadSummary, BatterySummary, InverterSummary, PanelSummary, ArraySummary,
  ProtectionSummary,
} from './calc-storage'

export interface ChainSummaries {
  load?: LoadSummary | null
  battery?: BatterySummary | null
  inverter?: InverterSummary | null
  panels?: PanelSummary | null
  array?: ArraySummary | null
  protection?: ProtectionSummary | null
}

// ---------------------------------------------------------------------------
// Which steps are done
// ---------------------------------------------------------------------------

export interface StepState {
  id: StepId
  label: string
  href: string | null
  n: number
  done: boolean
  /** What this step contributed, one line. Null when not done. */
  headline: string | null
}

const kw = (w: number) => `${(w / 1000).toFixed(1)} kW`

export function chainState(s: ChainSummaries): StepState[] {
  return CALC_STEPS.map(step => {
    let headline: string | null = null
    switch (step.id) {
      case 'load':
        if (s.load) headline = `${s.load.rawKwh.toFixed(1)} kWh/day at the socket`
        break
      case 'battery':
        if (s.battery) {
          const pack = s.battery.model ?? s.battery.chemistry.toUpperCase()
          headline = s.battery.bankKwh !== undefined
            ? `${s.battery.bankKwh} kWh of ${pack}`
            : `${pack} chosen, bank size not published`
        }
        break
      case 'inverter':
        if (s.inverter) {
          const name = [s.inverter.brand, s.inverter.model].filter(Boolean).join(' ')
          headline = `${kw(s.inverter.acContinuousW)}${name ? ` — ${name}` : ''}`
        }
        break
      case 'panels':
        if (s.panels) headline = `${s.panels.panels} × ${s.panels.panelWatt}W = ${kw(s.panels.arrayWatts)}`
        break
      case 'array':
        if (s.array) headline = `${s.array.series}S${s.array.parallel}P — ${s.array.vocColdV.toFixed(0)}V cold`
        break
      case 'protection': {
        const n = s.protection?.runs.length ?? 0
        if (n > 0) {
          headline = `${n} cable run${n === 1 ? '' : 's'} sized — ` +
            s.protection!.runs.map(r => r.awgLabel).join(', ') + ' AWG'
        }
        break
      }
      case 'system':
        break
    }
    return {
      id: step.id, label: step.label, href: step.href, n: step.n,
      done: headline !== null, headline,
    }
  })
}

// ---------------------------------------------------------------------------
// Where two steps disagree
// ---------------------------------------------------------------------------

export type Severity = 'blocking' | 'warning' | 'note'

export interface Disagreement {
  id: string
  severity: Severity
  /** One line naming the conflict. */
  title: string
  /** What each side says, and why neither is wrong alone. */
  detail: string
  /** What to do about it. */
  resolution: string
  /** The steps involved, so the page can link back. */
  steps: StepId[]
}

/**
 * Conflicts between steps. Each one is a thing no single page can see, which
 * is the entire justification for this page existing.
 */
export function disagreements(s: ChainSummaries): Disagreement[] {
  const out: Disagreement[] = []

  // THE flagship case. Panel sizing rounds up from an energy target; array
  // wiring must factor that into whole strings inside a voltage window. The
  // two can simply not meet, and for some pairings every odd count fails.
  if (s.panels && s.array && s.panels.panels !== s.array.panels) {
    const wanted = s.panels.panels
    const wired = s.array.panels
    out.push({
      id: 'panel-count-mismatch',
      severity: 'blocking',
      title: `Panel sizing asks for ${wanted}; the array is wired for ${wired}`,
      detail:
        `Step 4 sized the array on energy and rounded up to ${wanted} panels. Step 5 has to ` +
        `split that into whole strings that fit the inverter's voltage window and current ` +
        `limit, and it settled on ${wired}. Neither figure is wrong on its own terms — energy ` +
        'sizing does not know the voltage window, and the arrangement does not know your ' +
        'daily kWh.',
      resolution:
        wired > wanted
          ? `Buying ${wired} is the simpler fix: it wires cleanly and gives you more headroom ` +
            'than the energy target needed.'
          : `${wired} panels is less than the energy target. Either accept the shortfall, or ` +
            `go up to the next count that wires cleanly and check the array still fits the ` +
            "inverter's PV input.",
      steps: ['panels', 'array'],
    })
  }

  // The array physically cannot be wired at all.
  if (s.panels && !s.array) {
    out.push({
      id: 'array-not-wired',
      severity: 'warning',
      title: 'The array has a size but no wiring plan',
      detail:
        `Step 4 says ${s.panels.panels} panels. Until step 5 works out how they go in series ` +
        'and parallel, nothing has checked that count against your inverter — and a panel ' +
        'count that cannot be split into safe strings is a real outcome, not a corner case.',
      resolution: 'Do the array wiring step. It needs your panel datasheet and your site temperatures.',
      steps: ['panels', 'array'],
    })
  }

  // Array watts past what the unit converts.
  if (s.array && s.inverter && s.array.arrayWatts > s.inverter.pvMaxPowerW) {
    const over = Math.round((s.array.arrayWatts / s.inverter.pvMaxPowerW - 1) * 100)
    out.push({
      id: 'array-over-pv-input',
      severity: over > 30 ? 'warning' : 'note',
      title: `The array is ${over}% more than the inverter's PV input accepts`,
      detail:
        `${kw(s.array.arrayWatts)} of panel into a ${kw(s.inverter.pvMaxPowerW)} input. Some ` +
        'over-paneling is deliberate — the extra fills in cloudy mornings and the peak is ' +
        'clipped — but past roughly 30% you are buying panels the inverter will never use.',
      resolution: 'Fewer panels, a bigger unit, or accept the clipping knowingly.',
      steps: ['array', 'inverter'],
    })
  }

  // The bank's voltage and the unit's voltage must be the same number.
  if (s.battery?.systemVoltage !== undefined && s.inverter &&
      s.battery.systemVoltage !== s.inverter.dcSystemVoltage) {
    out.push({
      id: 'voltage-mismatch',
      severity: 'blocking',
      title: `The bank is ${s.battery.systemVoltage}V and the inverter is ${s.inverter.dcSystemVoltage}V`,
      detail:
        'These have to be the same number. A 48V inverter cannot run from a 24V bank, and ' +
        'the battery step sized amp-hours at its own voltage — so the Ah figure is wrong too, ' +
        'not just the pairing.',
      resolution:
        'Set both to the same voltage and re-check the bank. Higher voltage means less current ' +
        'for the same power, which is why bigger systems move up.',
      steps: ['battery', 'inverter'],
    })
  }

  // Bank size implies a voltage the chosen unit does not use.
  if (s.battery?.bankKwh !== undefined && s.inverter) {
    const implied = recommendedSystemVoltage(s.battery.bankKwh)
    if (implied > s.inverter.dcSystemVoltage) {
      out.push({
        id: 'voltage-low-for-bank',
        severity: 'note',
        title: `A ${s.battery.bankKwh} kWh bank usually runs at ${implied}V, not ${s.inverter.dcSystemVoltage}V`,
        detail:
          'A bank this size at a lower voltage draws proportionally more current, which sizes ' +
          'every conductor, fuse and busbar between the battery and the inverter.',
        resolution:
          `Not wrong, but check the battery cable on the protection step — at ` +
          `${s.inverter.dcSystemVoltage}V it will be noticeably fatter than at ${implied}V.`,
        steps: ['battery', 'inverter'],
      })
    }
  }

  // Three or more strings need fusing and the user may not know it.
  if (s.array?.stringFuseRequired === true) {
    out.push({
      id: 'string-fuses-needed',
      severity: 'warning',
      title: 'This arrangement needs string fuses',
      detail:
        `${s.array.stringsPerTracker} strings share a tracker, and at that count the others ` +
        'can back-feed more current into a faulted string than the module is built to ' +
        'survive — NEC 690.9(A).',
      resolution: 'Each string gets its own fuse in the combiner. The array step sizes them.',
      steps: ['array', 'protection'],
    })
  }

  if (s.array?.stringFuseRequired === null) {
    out.push({
      id: 'fuse-rating-unknown',
      severity: 'note',
      title: 'Whether you need string fuses is unknown',
      detail:
        "Your panel's maximum series fuse rating has not been entered, and that rating is what " +
        'decides it. It is printed on the module label, commonly 15A, 20A or 25A.',
      resolution: 'Enter it on the array step and the question answers itself.',
      steps: ['array'],
    })
  }

  return out
}

// ---------------------------------------------------------------------------
// The assumptions holding it up
// ---------------------------------------------------------------------------

export type Sensitivity = 'high' | 'medium' | 'low'

export interface Assumption {
  id: string
  /** What it is, plainly. */
  label: string
  /** The value in effect, formatted. */
  value: string
  /** Which step it was set on. */
  step: StepId
  /** True when it still equals the shipped default. */
  atDefault: boolean
  /** What it changes further down the chain. */
  affects: string
  sensitivity: Sensitivity
  /** Why it is uncertain, or which way it errs. */
  caveat?: string
}

/**
 * Every figure that shapes the answer, with where it came from.
 *
 * Ordered by how much it can move the result, because a list of twenty
 * assumptions in arbitrary order teaches nothing about which to go and check.
 */
export function assumptions(
  s: ChainSummaries,
  unit: TempUnit = DEFAULT_TEMP_UNIT,
): Assumption[] {
  const out: Assumption[] = []

  if (s.load) {
    out.push({
      id: 'inverter-efficiency',
      label: 'Inverter and wiring efficiency',
      value: `${Math.round(s.load.efficiency * 100)}%`,
      step: 'load',
      atDefault: s.load.efficiency === EFF.inverter,
      affects: 'Everything. The battery is sized on what it must deliver through this, and the array on what must survive it.',
      sensitivity: 'high',
      caveat: 'A real figure comes from your inverter datasheet, and drops at low load.',
    })

    // A summary saved before cooling and heating were split out has no
    // `cooling` key at all — normalize rather than cast (rule 12b).
    const breakdown = normalizeBreakdown(s.load.breakdown)
    if (breakdown && breakdown.cooling > 0) {
      out.push({
        id: 'cooling-duty',
        label: 'Air-conditioning duty cycle',
        value: '100% while in service',
        step: 'load',
        atDefault: true,
        affects: 'Daily kWh, and through it the bank and the array.',
        sensitivity: 'high',
        caveat:
          'A thermostatic load does not run continuously. This is deliberately left at 100% ' +
          'because no two-source figure was established — it OVERSIZES rather than under.',
      })
    }
  }

  if (s.battery) {
    if (s.battery.autonomyDays !== undefined) {
      out.push({
        id: 'autonomy',
        label: 'Days of autonomy',
        value: `${s.battery.autonomyDays} day${s.battery.autonomyDays === 1 ? '' : 's'}`,
        step: 'battery',
        atDefault: s.battery.autonomyDays === 2,
        affects: 'Bank size, directly and linearly. Two days is twice the battery of one.',
        sensitivity: 'high',
      })
    }
    out.push({
      id: 'dod',
      label: 'Depth of discharge',
      value: `${Math.round(s.battery.dod * 100)}%`,
      step: 'battery',
      atDefault: false,
      affects: 'Bank size, inversely. Halving usable depth doubles the bank you must buy.',
      sensitivity: 'high',
      caveat: 'Set by the chemistry you picked, not chosen freely.',
    })
    out.push({
      id: 'round-trip',
      label: 'Battery round-trip efficiency',
      value: `${Math.round(s.battery.roundTrip * 100)}%`,
      step: 'battery',
      atDefault: false,
      affects: 'Array size. Energy is stored before it is used, so the panels pay this loss.',
      sensitivity: 'medium',
    })
  }

  if (s.panels) {
    out.push({
      id: 'peak-sun',
      label: 'Peak sun hours',
      value: `${s.panels.peakSunHours}h annual, ${s.panels.worstMonthHours}h in ${s.panels.worstMonthName}`,
      step: 'panels',
      atDefault: false,
      affects: 'Array size, inversely and strongly. It is the single largest uncertainty in the chain.',
      sensitivity: 'high',
      caveat:
        'A regional average, not a measurement of your roof. No tilt, no shading, no horizon. ' +
        'A tree to the south beats every other number here.',
    })
    out.push({
      id: 'array-derate',
      label: 'Array losses',
      value: `${Math.round(s.panels.arrayDerate * 100)}%`,
      step: 'panels',
      atDefault: s.panels.arrayDerate === EFF.array,
      affects: 'Array size. Soiling, cell temperature, MPPT conversion and array cabling together.',
      sensitivity: 'high',
    })
  }

  if (s.array) {
    out.push({
      id: 'design-low',
      label: 'Coldest expected temperature',
      value: formatTemp(s.array.designLowC, unit),
      step: 'array',
      atDefault: false,
      affects:
        'How many panels may go in series. Colder means higher Voc means fewer per string — ' +
        'this is a protection limit, not a preference.',
      sensitivity: 'high',
      caveat:
        'From a named place, not your site. Cold air pools in valleys, and a nearby station ' +
        "record is usually colder. When unsure, colder is the safe direction.",
    })
    out.push({
      id: 'cell-rise',
      label: 'Cell temperature rise in sun',
      // A DIFFERENCE, so it converts without the offset.
      value: `${formatDelta(DEFAULT_CELL_RISE_C, unit)} above air`,
      step: 'array',
      atDefault: true,
      affects: 'The hot-day working voltage, and so the minimum panels per string.',
      sensitivity: 'medium',
      caveat: 'A rule of thumb. Mounting style and airflow move it either way.',
    })
  }

  const rank: Record<Sensitivity, number> = { high: 0, medium: 1, low: 2 }
  return out.sort((a, b) => rank[a.sensitivity] - rank[b.sensitivity])
}

// ---------------------------------------------------------------------------
// How much to trust the answer
// ---------------------------------------------------------------------------

export type ConfidenceLevel = 'wide' | 'moderate' | 'narrow'

export interface Confidence {
  level: ConfidenceLevel
  /** One line on what the level means. */
  summary: string
  /** The reasons, worst first — this is the useful part, not the word. */
  drivers: string[]
}

/**
 * A qualitative band, deliberately not a percentage.
 *
 * See the file header: a numeric interval would need error distributions this
 * app does not have, and printing one would be exactly the false precision the
 * rest of the site refuses.
 */
export function confidence(
  s: ChainSummaries,
  unit: TempUnit = DEFAULT_TEMP_UNIT,
): Confidence {
  const drivers: string[] = []
  // 'system' is the destination, not a task — outstandingSteps already drops
  // it. Protection now publishes a summary, so it is counted like the rest.
  const missing = outstandingSteps(s)

  if (missing.length > 0) {
    drivers.push(
      `${missing.length} step${missing.length === 1 ? '' : 's'} not done yet ` +
      `(${missing.map(m => m.label.toLowerCase()).join(', ')}) — nothing has checked those limits.`,
    )
  }

  const blocking = disagreements(s).filter(d => d.severity === 'blocking')
  if (blocking.length > 0) {
    drivers.push(
      blocking.length === 1
        ? 'Two steps disagree with each other. Until that is resolved the system is not ' +
          'buildable as described.'
        : `Steps disagree with each other in ${blocking.length} places. Until those are ` +
          'resolved the system is not buildable as described.',
    )
  }

  const highDefaults = assumptions(s, unit).filter(a => a.sensitivity === 'high' && a.atDefault)
  if (highDefaults.length > 0) {
    drivers.push(
      `${highDefaults.length} of the figures that move the answer most are still at their ` +
      `defaults (${highDefaults.map(a => a.label.toLowerCase()).join(', ')}).`,
    )
  }

  if (s.panels) {
    drivers.push(
      'Peak sun hours are a regional average rather than a measurement of your roof, which ' +
      'is the largest single uncertainty in any solar estimate.',
    )
  }

  const level: ConfidenceLevel =
    blocking.length > 0 || missing.length >= 2
      ? 'wide'
      : missing.length > 0 || highDefaults.length > 1
        ? 'moderate'
        : 'narrow'

  const summary =
    level === 'wide'
      ? 'Treat these numbers as a sketch. Enough is unresolved that the real system could differ substantially.'
      : level === 'moderate'
        ? 'A reasonable starting estimate. The figures below are the ones worth replacing with your own.'
        : 'As tight as this tool gets — which is still an estimate, not a specification.'

  return { level, summary, drivers }
}

/**
 * Steps that represent outstanding work.
 *
 * 'system' is excluded even though it has a page: it is the destination, not a
 * task, and it never publishes a summary of its own. Counting it as
 * outstanding made chainComplete permanently false and left the confidence
 * band permanently reporting a missing step.
 */
export function outstandingSteps(s: ChainSummaries): StepState[] {
  return chainState(s).filter(st => st.href !== null && st.id !== 'system' && !st.done)
}

/** True when every step that represents real work has been completed. */
export function chainComplete(s: ChainSummaries): boolean {
  return outstandingSteps(s).length === 0
}
