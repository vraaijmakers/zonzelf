/**
 * The cable runs a solar system actually has, and what current each carries.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The cable calculator asked for "Current (amps)" and "One-way cable length"
 * and nothing else. A user who has just been through four steps that hand
 * numbers forward arrives at a naked field with no indication of WHICH cable
 * it is sizing — and a solar system has at least four completely different
 * runs, with different currents, different voltages, different code rules and
 * different consequences for getting them wrong:
 *
 *   1. One panel string down to the combiner. Long, low current, PV rules.
 *   2. Combiner to the inverter. Same voltage, several strings of current.
 *   3. Battery to inverter. SHORT and enormous — the highest current in the
 *      system by a wide margin, and the one people underestimate.
 *   4. Inverter to the AC panel. Ordinary AC branch-circuit territory.
 *
 * Asking for one number without saying which run it belongs to invites people
 * to size the whole system on whichever figure they happened to remember. The
 * chain already knows most of these currents, so it should offer them.
 *
 * WHAT IS DERIVED AND WHAT IS NOT
 * -------------------------------
 * The currents here are OPERATING currents — the raw figure, before any code
 * factor. The 125% (or 156% for a PV source circuit) is applied downstream by
 * sizingFactor in awg.ts, and pre-multiplying here would apply it twice. That
 * is why this module returns panel Isc rather than the array summary's
 * designIscA, which already carries the irradiance factor.
 *
 * Lengths are NOT derived. Nothing upstream knows how far the roof is from the
 * battery, so each run carries a typical starting length and expects the user
 * to replace it.
 *
 * THE BATTERY RUN IS SIZED FOR CONTINUOUS DRAW
 * --------------------------------------------
 * An inverter at surge pulls roughly twice its continuous current for a few
 * seconds. Conductors are sized for continuous duty, so that spike does not
 * enter the ampacity calculation — a few seconds does not heat a cable to its
 * limit. It does show up as voltage drop, though, which is why a sagging
 * battery cable makes an inverter cut out on motor start even when the bank is
 * full. Keeping this run short and fat is the fix, and it is why the suggested
 * length here is a few feet rather than a few tens of feet.
 */

import type { CircuitKind } from './awg'
import { dcCurrentFor } from './system-voltage'
import type { ArraySummary, InverterSummary, LoadSummary } from './calc-storage'

export type RunId = 'pv-string' | 'pv-combined' | 'battery-inverter' | 'inverter-ac'

export interface CircuitRun {
  id: RunId
  label: string
  /** Physically, where this cable goes. Plain words. */
  where: string
  kind: CircuitKind
  /** A starting one-way length in feet. Always the user's to replace. */
  typicalFeet: number
  /**
   * Voltage-drop budget conventionally allowed on this run, as a percent.
   * Not a code limit — NEC 210.19(A) Informational Note 4 suggests 3% on a
   * branch and 5% overall, and those notes are advisory. The battery run gets
   * a tighter figure because it carries the most current and its drop is what
   * makes an inverter cut out early.
   */
  suggestedDropPercent: number
  /** Why this run is the one that catches people out. */
  note: string
  /**
   * Plausible fixed voltages for this run, offered as buttons. EMPTY for the
   * PV runs, because a string's voltage is whatever its panels add up to and
   * there is no standard value to offer.
   */
  voltageOptions: readonly number[]
  /**
   * What the voltage on this run actually is.
   *
   * This field was labelled "System voltage" and offered 12/24/48/120/240 for
   * every run, which is wrong twice over. "System voltage" is a term of art in
   * solar meaning the BATTERY BANK nominal, and a PV string is nothing like
   * it: seven panels at 41V is a 287V circuit. The number is used only to turn
   * the voltage drop into a percentage, so it has to be the operating voltage
   * of the run being sized — and saying which one that is, per run, is the
   * only way to stop the confusion.
   */
  voltageMeans: string
}

export const CIRCUIT_RUNS: readonly CircuitRun[] = [
  {
    id: 'pv-string',
    label: 'One panel string → combiner',
    where: 'From the last panel in a string down to the combiner box or the inverter input.',
    kind: 'pv-source',
    typicalFeet: 30,
    suggestedDropPercent: 2,
    note:
      'Usually the longest run in the system and the lowest current, because a string is ' +
      'high voltage. High voltage is what makes that distance affordable — the same power ' +
      'at battery voltage would need cable you could not bend.',
    voltageOptions: [],
    voltageMeans:
      'The string\'s own working voltage — the panels in series, added together. NOT your battery voltage: seven 41V panels in series is a 287V circuit, and the drop percentage is measured against that.',
  },
  {
    id: 'pv-combined',
    label: 'Combiner → inverter',
    where: 'From the combiner box, where parallel strings join, to the inverter PV input.',
    kind: 'pv-source',
    typicalFeet: 20,
    suggestedDropPercent: 2,
    note:
      'Carries every parallel string on that tracker at once. Only exists if you have more ' +
      'than one string per tracker — with a single string, the run above goes straight in.',
    voltageOptions: [],
    voltageMeans:
      'Still the string voltage. Parallel strings add current, not volts, so combining them does not change this number.',
  },
  {
    id: 'battery-inverter',
    label: 'Battery → inverter',
    where: 'From the battery bank terminals or busbar to the inverter DC input.',
    kind: 'general',
    typicalFeet: 5,
    suggestedDropPercent: 1,
    note:
      'The highest current in the whole system, by a long way, and the run people most often ' +
      'undersize. Keep it SHORT — every foot costs voltage the inverter needs. A long, thin ' +
      'battery cable is why an inverter cuts out on motor start with a full bank.',
    voltageOptions: [12, 24, 48],
    voltageMeans:
      'The battery bank nominal — this is the run where "system voltage" means what people usually mean by it.',
  },
  {
    id: 'inverter-ac',
    label: 'Inverter → AC panel',
    where: 'From the inverter AC output to the distribution panel or the first load.',
    kind: 'general',
    typicalFeet: 15,
    suggestedDropPercent: 3,
    note:
      'Ordinary AC branch-circuit wiring, and the least surprising run — high voltage means ' +
      'modest current. Split-phase 120/240V systems carry half the current of a 120V-only ' +
      'system for the same power.',
    voltageOptions: [120, 240],
    voltageMeans:
      'The AC output voltage. Split-phase systems measure drop against 240V across both legs; a 120V-only circuit uses 120.',
  },
] as const

export interface ResolvedRun extends CircuitRun {
  /** Operating current, BEFORE any code factor. Null when unknown. */
  amps: number | null
  /** Nominal circuit voltage, for the drop calculation. Null when unknown. */
  volts: number | null
  /** How the current was worked out, shown so it is never a bare number. */
  derivation: string | null
  /** False when this run does not exist in the user's system. */
  applies: boolean
}

export interface ChainSummaries {
  inverter?: InverterSummary | null
  array?: ArraySummary | null
  load?: LoadSummary | null
}

export function runById(id: RunId): CircuitRun {
  const run = CIRCUIT_RUNS.find(r => r.id === id)
  if (!run) throw new Error(`Unknown circuit run: ${id}`)
  return run
}

// Computed currents are rounded for a legible field; a figure that came
// straight off a datasheet is NOT. Rounding 14.03A of Isc to 14.0A loses
// precision that a protection factor then multiplies.
const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Fill each run's current and voltage from what the earlier steps published.
 * A run whose inputs are missing comes back with nulls rather than a guess —
 * the page then asks for the number instead of inventing one.
 */
export function resolveRuns(s: ChainSummaries): ResolvedRun[] {
  const inv = s.inverter ?? null
  const arr = s.array ?? null

  return CIRCUIT_RUNS.map((run): ResolvedRun => {
    switch (run.id) {
      case 'pv-string': {
        if (!arr || !(arr.panelIscA > 0)) return { ...run, amps: null, volts: null, derivation: null, applies: true }
        return {
          ...run,
          amps: arr.panelIscA,
          volts: Math.round(arr.vmpHotV),
          derivation:
            `One string carries one panel's short-circuit current: ${arr.panelIscA}A. ` +
            `Its working voltage on a hot day is about ${Math.round(arr.vmpHotV)}V ` +
            `(${arr.series} panels in series).`,
          applies: true,
        }
      }
      case 'pv-combined': {
        if (!arr || !(arr.panelIscA > 0)) return { ...run, amps: null, volts: null, derivation: null, applies: true }
        const strings = Math.max(1, arr.stringsPerTracker ?? 1)
        const amps = Math.round(arr.panelIscA * strings * 100) / 100
        return {
          ...run,
          amps,
          volts: Math.round(arr.vmpHotV),
          derivation:
            `${strings} string${strings === 1 ? '' : 's'} on a tracker at ${arr.panelIscA}A each ` +
            `= ${amps}A. Voltage is unchanged at about ${Math.round(arr.vmpHotV)}V — ` +
            'parallel strings add current, not volts.',
          // With one string per tracker there is nothing to combine.
          applies: strings > 1,
        }
      }
      case 'battery-inverter': {
        if (!inv || !(inv.acContinuousW > 0) || !(inv.dcSystemVoltage > 0)) {
          return { ...run, amps: null, volts: null, derivation: null, applies: true }
        }
        const eff = s.load?.efficiency ?? 0.85
        const amps = dcCurrentFor(inv.acContinuousW, inv.dcSystemVoltage, eff)
        return {
          ...run,
          amps: round1(amps),
          volts: inv.dcSystemVoltage,
          derivation:
            `${inv.acContinuousW.toLocaleString()}W continuous out of a ${inv.dcSystemVoltage}V ` +
            `bank, at ${Math.round(eff * 100)}% inverter efficiency, draws ${Math.round(amps)}A. ` +
            'The battery supplies the losses too, so the DC side carries more than the AC ' +
            'side suggests.',
          applies: true,
        }
      }
      case 'inverter-ac': {
        if (!inv || !(inv.acContinuousW > 0)) {
          return { ...run, amps: null, volts: null, derivation: null, applies: true }
        }
        // Split-phase at 240V is the usual off-grid output in the US market.
        const amps = inv.acContinuousW / 240
        return {
          ...run,
          amps: round1(amps),
          volts: 240,
          derivation:
            `${inv.acContinuousW.toLocaleString()}W at 240V is ${round1(amps)}A. At 120V only, ` +
            `it would be ${round1(inv.acContinuousW / 120)}A — double the current for the same ` +
            'power, which is why split-phase output uses smaller cable.',
          applies: true,
        }
      }
    }
  })
}

/**
 * Whether the array needs a combiner box at all, and whether that box needs
 * fuses in it. Both fall out of the array step rather than being new inputs.
 */
export function combinerAdvice(arr: ArraySummary | null | undefined): {
  needed: boolean
  fused: boolean | null
  why: string
} | null {
  if (!arr) return null
  const strings = Math.max(1, arr.stringsPerTracker ?? 1)
  if (strings <= 1) {
    return {
      needed: false,
      fused: false,
      why:
        'One string per tracker, so there is nothing to combine — the string runs straight to ' +
        'the inverter input. A disconnect is still required, and that is a separate question ' +
        'from combining.',
    }
  }
  return {
    needed: true,
    fused: arr.stringFuseRequired,
    why:
      arr.stringFuseRequired === null
        ? `${strings} strings join on each tracker, so they need combining. Whether that box ` +
          'needs fuses depends on your panel’s maximum series fuse rating, which has not ' +
          'been entered — it is printed on the module label.'
        : arr.stringFuseRequired
          ? `${strings} strings join on each tracker, and at that count the others can back-feed ` +
            'more current into a faulted string than the module is built to survive. Each string ' +
            'gets its own fuse in the combiner — NEC 690.9(A).'
          : `${strings} strings join on each tracker. At this count the possible back-feed stays ` +
            'inside what the module can survive, so string fuses are not required by 690.9(A) — ' +
            'though a combiner box and a disconnect still are.',
  }
}

/**
 * What the inverter actually sees after the cable, against its tracking floor.
 *
 * WHY THIS EXISTS
 * ---------------
 * A voltage-drop percentage is a PROXY for the thing that matters. On a PV
 * string the real question is not "did I lose more than 2%" but "does enough
 * voltage arrive for the tracker to work". Those are different questions and
 * they bind in different situations: a long thin run on a tall string loses a
 * lot of percent and still clears the floor easily, while a short fat run on a
 * two-panel string can be inside its percentage budget and still fall under.
 *
 * WHICH VOLTAGE, AND WHY THE HOT ONE
 * ----------------------------------
 * Vmp at the hottest cell temperature, because that is the lowest the string
 * ever operates at — and it is the same condition that puts it closest to the
 * floor. The conservative choice for the drop percentage and the actual
 * failure case turn out to be the same number, which is a good sign the
 * reasoning is sound rather than a coincidence.
 *
 * WHICH CURRENT
 * -------------
 * Voltage drop is computed at the current that actually flows while power is
 * being delivered. That is Imp, not Isc: a short-circuited panel delivers no
 * power, so it is not the operating case. The cable page works from Isc
 * because NEC 690.8 sizes the CONDUCTOR from Isc, which makes its drop figure
 * about 4% pessimistic for a typical module — the safe direction, and worth
 * saying rather than hiding.
 */
export interface MpptArrival {
  /** String voltage at the array on the hottest day. */
  sourceV: number
  /** Volts lost in the cable, round trip. */
  dropV: number
  /** What reaches the inverter. */
  arrivingV: number
  /** The bottom of the tracking window. */
  floorV: number
  clears: boolean
  /** How far above the floor, in volts. Negative when it falls under. */
  marginV: number
}

export function mpptArrival(
  vmpHotV: number,
  dropV: number,
  mpptMinV: number,
): MpptArrival | null {
  if (!(vmpHotV > 0) || !(mpptMinV > 0) || !Number.isFinite(dropV)) return null
  const arrivingV = vmpHotV - Math.max(0, dropV)
  return {
    sourceV: vmpHotV,
    dropV: Math.max(0, dropV),
    arrivingV,
    floorV: mpptMinV,
    clears: arrivingV > mpptMinV,
    marginV: arrivingV - mpptMinV,
  }
}

/**
 * A battery or AC voltage left sitting in the field on a PV run.
 *
 * The field used to be labelled "System voltage" and offered 12/24/48/120/240
 * for every run, so this is the exact state someone lands in after selecting a
 * PV run: a plausible-looking number that is wrong by an order of magnitude,
 * and which silently changes the answer by several gauge sizes.
 */
const NON_PV_VOLTAGES = [12, 24, 48, 120, 240]

export function looksLikeBatteryVoltage(kind: CircuitKind, volts: number): boolean {
  return kind === 'pv-source' && NON_PV_VOLTAGES.includes(volts)
}
