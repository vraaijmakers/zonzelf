/**
 * Equipment-gated commissioning procedure.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Step 7 could see that you picked an SPH10048P and an SG48100P and still
 * said nothing about the LCD. Factory default on the SPH is GEL. Someone
 * standing at the inverter needs an ORDER — power-up sequence, comms cable,
 * settings, verification — not six disconnected verdict cards.
 *
 * WHY IT IS A PROCEDURE AND STILL A PROTECTION OUTPUT
 * --------------------------------------------------
 * The earlier version refused to emit any setpoint, because the two manuals
 * disagree on charge voltage (54.5 V on the pack sheet, 54 V in its own §8.1,
 * 56 V full-charge judgment, 56.8 V in the SPH L16 table) and picking one
 * would put the site's authority behind a guess.
 *
 * Item 39 dissolves most of that. Its default is LCBMS: with the BMS talking,
 * the PACK governs charge voltage and current, so no human types the disputed
 * number at all. The procedure's main path is therefore "get closed-loop
 * working, then let the pack decide", and every value on that path is one the
 * manual states outright (L16, DIS, 60 Hz, 120 V, 180°).
 *
 * The disagreement has not gone away — it moves to where it actually bites:
 * the open-loop fallback ([08] USER), which is the one place a person must
 * type a voltage. That branch stays a ProtectionView showing all four figures.
 * Nothing here ever prints "recommended"; assertProtectionView rejects it.
 *
 * GATE. A procedure is produced only for an admitted pairing. Typed-in specs,
 * an EG4 against a Sun Gold pack, or chemistry-without-a-preset all return
 * null — menu IDs are firmware-and-model-specific, and a wrong ID is worse
 * than none. V1 is SPH8048P or SPH10048P + SG48100P.
 *
 * GENERATOR IS AN INPUT. Charge current is the lowest of four ceilings.
 * Missing the generator kW, do not emit amps for that ceiling — list it
 * as not given.
 */

import { assertProtectionView, type ProtectionView } from './calc-register'
import { findBatteryPreset, type BatteryPreset } from './battery-preset'
import { INVERTER_PRESETS, type InverterSpec } from './inverter-sizing'
import type { ArraySummary } from './calc-storage'

const SPH_IDS = new Set(['sungold-sph8048p', 'sungold-sph10048p'])
const SG48100P_ID = 'sungold-sg48100p'

/** SPH L16 lithium table, User Manual V1.3 §5.6. Not a source for the pack. */
export const SPH_L16 = {
  boostV: 56.8,
  floatV: 56.8,
  undervoltageAlarmV: 49.6,
  undervoltageDisconnectV: 48.8,
  dischargeLimitV: 46.4,
  factoryBatteryType: 'GEL',
} as const

/** Item 28 — AC-in (grid/generator) charge current ceiling, §5.2. Default 60 A. */
function sphAcChargeA(model: string): number {
  if (model === 'SPH8048P') return 100
  if (model === 'SPH10048P') return 120
  throw new Error(`no AC-in charge current recorded for ${model}`)
}

export interface CommissioningPair {
  inverter: InverterSpec
  battery: BatteryPreset
}

export interface CommissioningInput {
  /** Packs in parallel. Omit rather than invent when the bank size is unknown. */
  parallelCount?: number
  /** Generator size, kW. Omit when there is no generator or it is unstated. */
  generatorKw?: number
  /** What the array step published, when it has been done. */
  array?: ArraySummary
}

export interface WorkModeOption {
  id: string
  label: string
  when: string
}

/** One row of the LCD settings table. */
export interface SettingRow {
  /** Menu item number as the LCD prints it, e.g. '08'. */
  item: string
  name: string
  /** What to set it to. A value here is one the manual states outright. */
  value: string
  why: string
  /**
   * Items the manual marks "turn off the rocker switch can be set" — they
   * cannot be changed while the inverter is running, which is why they are
   * in the sequence before anything is energised.
   */
  standbyOnly?: boolean
}

/** A pin table, printed as-is from one manual so the reader can compare. */
export interface PinTable {
  title: string
  source: string
  rows: { signal: string; pins: string }[]
}

export interface FaultCode {
  code: string
  name: string
  meaning: string
  /** What it means for THIS procedure, not in general. */
  here: string
}

export interface CommissioningStep {
  id: string
  title: string
  /** One line: what this step is for. */
  purpose: string
  /** Ordered instructions. */
  actions?: string[]
  pinouts?: PinTable[]
  settings?: SettingRow[]
  /** Protection outputs that belong at this point in the sequence. */
  views?: ProtectionView[]
  checks?: string[]
  faults?: FaultCode[]
  note?: string
}

export interface CommissioningMap {
  inverterModel: string
  batteryModel: string
  steps: CommissioningStep[]
  /** The open-loop branch. Only relevant when BMS comms cannot be made to work. */
  fallback: CommissioningStep
  workModes: WorkModeOption[]
}

const SPH_MANUAL =
  'Sun Gold SPH8-10KW User Manual V1.3 §5.2 (LCD settings), §5.6 (L16 table), ' +
  '§6.4 (RS485/CAN port) and §7.1 (fault codes)'
const PACK_MANUAL =
  'Sun Gold SG48100P user manual §3 (performance), §7.2.2 (interface pinout), ' +
  '§7.3 (CAN 500k / RS485 9600) and §9.5 (DIP switch)'

/**
 * The only pairing V1 will speak menu IDs for. Anything else is the generic
 * inverter-settings guide, not a procedure.
 *
 * Inverter summaries saved before preset ids existed still have brand + model.
 * Matching on those is the same admission — the id is a convenience, not a
 * second gate. Battery chemistry alone is not enough: 48 V LiFePO4 is many
 * packs, and menu IDs are model-specific.
 */
export function findAdmittedInverter(ref: {
  id?: string
  brand?: string
  model?: string
}): InverterSpec | undefined {
  if (ref.id) {
    const byId = INVERTER_PRESETS.find(p => p.id === ref.id)
    if (byId) return byId
  }
  const brand = ref.brand?.trim()
  const model = ref.model?.trim()
  if (!brand || !model) return undefined
  return INVERTER_PRESETS.find(p => p.brand === brand && p.model === model)
}

export function inverterOffersCommissioningMap(ref: {
  id?: string
  brand?: string
  model?: string
}): boolean {
  const spec = findAdmittedInverter(ref)
  return !!spec && SPH_IDS.has(spec.id)
}

export function commissioningPairing(
  inverterRef: { id?: string; brand?: string; model?: string } | string | undefined,
  batteryPresetId: string | undefined,
): CommissioningPair | null {
  const ref = typeof inverterRef === 'string' ? { id: inverterRef } : inverterRef
  const inverter = findAdmittedInverter(ref ?? {})
  if (!inverter || !batteryPresetId) return null
  if (!SPH_IDS.has(inverter.id) || batteryPresetId !== SG48100P_ID) return null
  const battery = findBatteryPreset(batteryPresetId)
  if (!battery) return null
  return { inverter, battery }
}

export function commissioningMap(
  pair: CommissioningPair,
  input: CommissioningInput = {},
): CommissioningMap {
  const steps = [
    orderOfOperationsStep(),
    commsStep(pair),
    settingsStep(pair, input),
    arrayStep(pair, input),
    verifyStep(pair),
  ]
  const fallback = fallbackStep(pair)
  for (const step of [...steps, fallback]) {
    for (const view of step.views ?? []) assertProtectionView(view)
  }
  return {
    inverterModel: pair.inverter.model,
    batteryModel: pair.battery.model,
    steps,
    fallback,
    workModes: SPH_WORK_MODES,
  }
}

/* ── Step 1 ─────────────────────────────────────────────────────────────── */

/**
 * Items 31, 38 and 68 carry "turn off the rocker switch can be set" in the
 * manual's own settings table. That is why the sequence exists at all: get
 * them done before the machine is carrying anything.
 */
function orderOfOperationsStep(): CommissioningStep {
  return {
    id: 'order',
    title: 'Order of operations',
    purpose: 'Everything below assumes the machine is powered but not yet carrying anything.',
    actions: [
      'Wire the whole system with every breaker open — battery, PV and AC.',
      'Close the battery breaker first, then turn on the inverter rocker switch. The inverter runs off the pack while you set it up.',
      'Do the comms cable and all the settings below BEFORE closing the PV and AC breakers.',
      'Items 31 (parallel mode), 38 (AC output voltage) and 68 (phase mode) can only be changed with the rocker switch off — the manual marks each of them "turn off the rocker switch can be set". Set those first, or you will be power-cycling later.',
      'Close the PV breaker, then the AC breakers, and go to the verification step.',
    ],
    note:
      'This order is the manual\'s, not a house style. The standby-only items are the reason ' +
      'it matters: discovering item 68 mid-commissioning means shutting down and starting again.',
  }
}

/* ── Step 2 ─────────────────────────────────────────────────────────────── */

/**
 * The pin tables are printed from both manuals rather than summarised into
 * "use the supplied cable", because for THIS pairing they happen to match
 * pin-for-pin on both buses and the reader can see that for themselves.
 *
 * The battery sheet numbers its two RJ45 sockets 1–8 and 9–16 continuously;
 * its own parallel-port table gives both numberings for identical signals
 * (1,8 ≡ 9,16 = RS485-B), which is what establishes that 9–16 is simply the
 * second socket's pins 1–8.
 */
function commsStep(pair: CommissioningPair): CommissioningStep {
  const { battery } = pair
  return {
    id: 'comms',
    title: 'Connect the BMS communication cable',
    purpose:
      'Closed-loop is the whole point: with the BMS talking, the pack governs charge ' +
      'voltage and current, and nobody has to pick between the two sheets.',
    actions: [
      `Set the pack's DIP switch to address 1 — switch #1 ON, #2 through #6 OFF (${battery.model} manual §9.5).`,
      'Run one RJ45 cable from the inverter\'s RS485/CAN port to the matching port on the battery.',
      `CAN runs at ${battery.canBaud ? battery.canBaud / 1000 + ' kbit/s' : '500 kbit/s'}, RS485 at ${battery.rs485Baud ?? 9600} baud. Either bus works; CAN is the shorter path because it needs only two pins.`,
      'Compare the two pin tables below before buying a special cable — on this pairing every signal lands on the same pin at both ends, so a straight-through patch cable is wired correctly for both buses.',
    ],
    pinouts: [
      {
        title: 'Inverter RS485/CAN port',
        source: 'SPH8-10KW User Manual V1.3 §6.4',
        rows: [
          { signal: 'RS485-B', pins: '1, 8' },
          { signal: 'RS485-A', pins: '2, 7' },
          { signal: 'CAN-H', pins: '4' },
          { signal: 'CAN-L', pins: '5' },
        ],
      },
      {
        title: `${battery.model} RS485 socket`,
        source: 'SG48100P user manual §7.2.2',
        rows: [
          { signal: 'RS485-B', pins: '1, 8' },
          { signal: 'RS485-A', pins: '2, 7' },
          { signal: 'GND', pins: '3, 6' },
          { signal: 'NC', pins: '4, 5' },
        ],
      },
      {
        title: `${battery.model} CAN socket`,
        source: 'SG48100P user manual §7.2.2',
        rows: [
          { signal: 'CAN-H', pins: '4' },
          { signal: 'CAN-L', pins: '5' },
          { signal: 'GND', pins: '7' },
          { signal: 'NC', pins: '1, 3, 6, 8' },
        ],
      },
    ],
    note:
      'The SPH manual attaches its own caveat to this port: if the inverter and the BMS will ' +
      'not talk, the protocol may need matching at the factory or the inverter may need a ' +
      'firmware update. That is a phone call to the manufacturer, not a setting.',
  }
}

/* ── Step 3 ─────────────────────────────────────────────────────────────── */

function settingsStep(pair: CommissioningPair, input: CommissioningInput): CommissioningStep {
  const { inverter, battery } = pair
  const n = input.parallelCount
  const invPv = inverter.maxChargeCurrentA ?? 0
  const invAc = sphAcChargeA(inverter.model)

  // Item 07 is a backstop while item 39 is LCBMS, so it is set from the
  // pack's STANDARD charge current (not its maximum), times however many
  // packs are in parallel, and never above what the machine allows.
  const packStandard = n !== undefined ? battery.standardChargeA * n : battery.standardChargeA
  const item07 = Math.min(packStandard, invPv)
  // The manual: "If the 28 item ... [is] greater than the 07 item ..., [it does]
  // not have an effect." So 28 is clamped to 07 as well as to the machine's
  // own AC-in ceiling — emitting a larger number would be emitting a no-op.
  const item28 = Math.min(packStandard, invAc, item07)
  const packNote = n !== undefined
    ? `${n} × ${battery.standardChargeA} A standard`
    : `${battery.standardChargeA} A standard for one pack`

  return {
    id: 'settings',
    title: 'Inverter settings',
    purpose:
      'Set these in the LCD menu with the machine idle. Item 08 is the one that matters ' +
      `most — the SPH ships as ${SPH_L16.factoryBatteryType}, which is a lead-acid charge profile.`,
    settings: [
      {
        item: '08', name: 'Battery type', value: `L${battery.seriesCount}`,
        why: `${battery.voltage} V LiFePO4 is ${battery.seriesCount} × 3.2 V. Factory default is ${SPH_L16.factoryBatteryType} — a lead-acid profile on a lithium pack.`,
      },
      {
        item: '32', name: 'RS485 comm function', value: 'CAN (or 485)',
        why: 'Must match the bus you cabled in the previous step.',
      },
      {
        item: '33', name: 'BMS protocol', value: 'SGP',
        why: 'SGP is the SPH menu token for Sun Gold Power. It is not printed on the battery sheet.',
      },
      {
        item: '39', name: 'Charge current limit', value: 'LCBMS (default)',
        why: 'Hands the charge ceiling to the BMS. This is what makes the two sheets\' disagreement moot — the pack decides, not you.',
      },
      {
        item: '07', name: 'Battery charge current', value: `${item07} A`,
        why: `${packNote}; the ${inverter.model} allows 0–${invPv} A. A backstop under LCBMS, and the real limit if comms drop.`,
      },
      {
        item: '28', name: 'Mains charge current', value: `${item28} A`,
        why: `AC-in alone, 0–${invAc} A on this model (default 60 A). Set above item 07 it has no effect, so it is capped there.`,
      },
      {
        item: '16', name: 'Equalizing charge', value: 'DIS',
        why: 'Equalize is a high-voltage stage for flooded lead-acid. On LiFePO4 it is abuse.',
      },
      {
        item: '02', name: 'AC output frequency', value: '60.0 Hz',
        why: 'US grid.',
      },
      {
        item: '38', name: 'AC output voltage', value: '120 V', standbyOnly: true,
        why: 'Standard US phase voltage. Range is 100/105/110/115/120/127 VAC.',
      },
      {
        item: '68', name: 'AC output phase mode', value: '180 (default)', standbyOnly: true,
        why: 'Split-phase: L1–L2 differ by 180°, giving 120 V to neutral and 240 V across. Setting 0 gives single-phase and no 240 V.',
      },
      {
        item: '58', name: 'SOC discharge alarm', value: '15%',
        why: 'Manual default. Warns before the cutoff rather than at it.',
      },
      {
        item: '59', name: 'SOC discharge cutoff', value: `${battery.socMinPct}%`,
        why: `Discharge stops below this. The pack sheet's working range is ${battery.socMinPct}–${battery.socMaxPct}%; the manual default of 5% is well under it.`,
      },
      {
        item: '60', name: 'SOC charge cutoff', value: `${battery.socMaxPct}%`,
        why: `Charge stops ABOVE this — it is a ceiling, not a reserve. Sheet's working range tops out at ${battery.socMaxPct}%.`,
      },
      {
        item: '61', name: 'SOC switch to mains', value: `${battery.socMinPct}%`,
        why: 'Grid or generator takes over at or above the discharge floor, so the pack is never emptied first.',
      },
      {
        item: '62', name: 'SOC back to inverter', value: '95–100%',
        why: 'Returns to battery once refilled. Manual default is 100%.',
      },
      {
        item: '01', name: 'AC output mode', value: 'a choice — see below',
        why: 'Work mode is a use-case decision, not a protection setting. This page will not pick one for you.',
      },
    ],
    views: [chargeCurrentView(pair, input)],
    note:
      'Items 58 through 62 are percent-of-capacity and the manual marks every one of them ' +
      '"only available during normal BMS communication". If step 2 did not take, they do nothing.',
  }
}

/* ── Step 4 ─────────────────────────────────────────────────────────────── */

/**
 * The array step already sized the strings against this inverter's window.
 * Repeating that arithmetic here would be a second implementation of it, so
 * this reads what step 5 published and says what to do with it.
 */
function arrayStep(pair: CommissioningPair, input: CommissioningInput): CommissioningStep {
  const { inverter } = pair
  const a = input.array
  if (!a) {
    return {
      id: 'array',
      title: 'PV strings',
      purpose: 'What to wire into each tracker.',
      note:
        'The array step has not been done yet, so there is no string configuration to carry ' +
        'over. Size the strings there — against this inverter\'s ' +
        `${inverter.mpptMinV}–${inverter.mpptMaxV} V window and ${inverter.pvMaxInputV} V ceiling — ` +
        'and the result will appear here. This page will not re-derive it.',
    }
  }
  const perTracker = a.stringsPerTracker
  return {
    id: 'array',
    title: 'PV strings',
    purpose: 'Carried over from the array step — not recalculated here.',
    actions: [
      `Wire ${a.series} panels in series per string, ${a.parallel} string${a.parallel === 1 ? '' : 's'} total (${a.panels} panels, ${(a.arrayWatts / 1000).toFixed(2)} kW).`,
      `Cold-weather open-circuit voltage is ${a.vocColdV.toFixed(0)} V against this inverter's ${inverter.pvMaxInputV} V hard limit; working voltage when hot is ${a.vmpHotV.toFixed(0)} V against the ${inverter.mpptMinV}–${inverter.mpptMaxV} V tracking window.`,
      `Spread the strings across both trackers — ${perTracker} on the worst-loaded one. Never parallel PV1 and PV2 together.`,
    ],
    note:
      `Design temperatures were ${a.designLowC} °C low and ${a.designHighC} °C high. Change those ` +
      'on the array step, not here.',
  }
}

/* ── Step 5 ─────────────────────────────────────────────────────────────── */

function verifyStep(pair: CommissioningPair): CommissioningStep {
  const { battery } = pair
  return {
    id: 'verify',
    title: 'Verify',
    purpose: 'Proof the closed loop is actually live, before you trust any of the SOC settings.',
    actions: [
      'Close the PV breaker, then the AC breakers.',
      'Page through the LCD status screens and find the BMS-sourced readings — battery voltage and state of charge reported by the pack.',
      'If those two are showing, items 58–62 are live. If they are not, the inverter is running open-loop no matter what item 32/33 say.',
    ],
    checks: [
      'BMS battery voltage and SOC appear on the status screens.',
      'No fault 58 and no fault 03.',
      `First full charge tapers and stops below the pack's ${battery.chargeLimitV} V charge limit` +
        (battery.fullChargeV ? `, with full-charge judgment at ${battery.fullChargeV} V` : '') + '.',
      `Resting SOC settles inside the ${battery.socMinPct}–${battery.socMaxPct}% working range.`,
    ],
    faults: [
      {
        code: '58', name: 'BMSComErr', meaning: 'BMS communication fault',
        here: 'The cable, the bus selected in item 32, or the protocol in item 33. Until this clears you are on the open-loop fallback below.',
      },
      {
        code: '03', name: 'BatOpen', meaning: 'Disconnected battery alarm',
        here: 'Power path, not comms — the battery breaker or the DC connection, not the RJ45.',
      },
    ],
  }
}

/* ── Fallback ───────────────────────────────────────────────────────────── */

/**
 * The one branch where a person must type a charge voltage, and therefore the
 * one place the datasheet disagreement actually costs something. It stays a
 * ProtectionView: four figures from three documents, none of them promoted.
 */
function fallbackStep(pair: CommissioningPair): CommissioningStep {
  return {
    id: 'fallback',
    title: 'If BMS communication cannot be established',
    purpose:
      'Fault 58 that will not clear. Running open-loop means voltage decides instead of ' +
      'the pack, which is the worse of the two paths for lithium — treat it as temporary.',
    actions: [
      'Set item 08 to USER, which unlocks the individual voltage items.',
      'The voltage items must stay in ascending order: 15 < 12 < 14 < 35 < 09. The LCD will accept a set that is out of order and behave strangely.',
      'Items 58–62 stop working entirely — they need the BMS. Your only protection is voltage.',
    ],
    views: [chargeVoltageView(pair), cutoffLadderView(pair)],
    note:
      'Get comms working and come back. Every number in this branch is a compromise between ' +
      'documents that do not agree.',
  }
}

function chargeVoltageView(pair: CommissioningPair): ProtectionView {
  const { battery } = pair
  const options = [
    `${battery.recommendedChargeV} V — pack spec table`,
    `${SPH_L16.boostV} V — SPH L${battery.seriesCount} boost`,
  ]
  return {
    id: 'charge-voltage',
    title: 'Item 09 boost voltage — three documents, four figures',
    options,
    empty: null,
    steps: [
      {
        title: 'Same brand, and they still disagree',
        body:
          `The pack's spec table says charge at ${battery.recommendedChargeV} V. Its own §8.1 ` +
          `says 54 V. Full-charge judgment is ${battery.fullChargeV ?? 56} V. The SPH ` +
          `L${battery.seriesCount} preset charges at ${SPH_L16.boostV} V boost and float. ` +
          `None of those is a transcription error, and flattening them into one number is ` +
          `the failure this row exists to prevent.`,
      },
      {
        title: 'Why this only matters here',
        body:
          'With item 39 on LCBMS and the BMS talking, the pack supplies the charge ceiling ' +
          'and none of these four numbers gets typed in. This branch is the open-loop case, ' +
          'where the choice is unavoidable and yours to make.',
      },
      {
        title: 'The ceiling that is not in dispute',
        body:
          `Whatever is chosen, it sits below the pack's charging limit of ${battery.chargeLimitV} V. ` +
          `That figure is stated once, in one document, and nothing contradicts it.`,
      },
    ],
    sources: [PACK_MANUAL, SPH_MANUAL],
  }
}

function cutoffLadderView(pair: CommissioningPair): ProtectionView {
  const { battery } = pair
  return {
    id: 'cutoff-ladder',
    title: 'The voltage ladder, open-loop',
    options: [
      `Item 15 discharge limit — at or above ${battery.dischargeCutoffV} V`,
      `Item 35 mains recovery — below the boost figure chosen above`,
    ],
    empty: null,
    steps: [
      {
        title: 'Ascending, or the machine misbehaves',
        body:
          'Items 15, 12, 14, 35 and 09 have to climb in that order. The SPH will accept a ' +
          'set that does not and the behaviour it produces is not documented.',
      },
      {
        title: 'Voltage is a poor proxy on this chemistry',
        body:
          `LiFePO4 sits flat until it is nearly empty. The pack's ${battery.dischargeCutoffV} V ` +
          `cut-off and the SPH L${battery.seriesCount} disconnect of ` +
          `${SPH_L16.undervoltageDisconnectV} V are both already-near-empty numbers — neither ` +
          `is a ${battery.socMinPct}% reserve. That is what items 58–62 were for.`,
      },
    ],
    sources: [PACK_MANUAL, SPH_MANUAL],
  }
}

/* ── Shared protection outputs ──────────────────────────────────────────── */

function chargeCurrentView(pair: CommissioningPair, input: CommissioningInput): ProtectionView {
  const { inverter, battery } = pair
  const n = input.parallelCount
  const packCeiling = n !== undefined
    ? `${battery.maxChargeA * n} A (${n} × ${battery.maxChargeA} A)`
    : `${battery.maxChargeA} A per pack`
  const invPv = inverter.maxChargeCurrentA
  const invAc = sphAcChargeA(inverter.model)
  const options = [
    `Pack: ${packCeiling}`,
    `Inverter item 07: ${invPv} A`,
    `Inverter item 28 (AC-in): ${invAc} A`,
  ]
  if (input.generatorKw !== undefined && input.generatorKw > 0) {
    const genA = (input.generatorKw * 1000) / battery.voltage
    options.push(`Generator: ${genA.toFixed(0)} A if the house is off (${input.generatorKw} kW / ${battery.voltage} V)`)
  } else {
    options.push('Generator: not given')
  }

  return {
    id: 'charge-current',
    title: 'Charge current — the lowest ceiling wins',
    options,
    empty: null,
    steps: [
      {
        title: 'Four limits, not the inverter maximum',
        body:
          `Item 07 is PV + AC-in together (0–${invPv} A on the ${inverter.model}). ` +
          `Item 28 is AC-in alone (0–${invAc} A). The pack accepts ${battery.maxChargeA} A ` +
          `continuous` +
          (n !== undefined ? ` × ${n} in parallel` : ', times however many sit in parallel') +
          `. A generator shares that budget with the house — size the charge amps against ` +
          `what is left, not against the nameplate.`,
      },
      {
        title: 'Continuous is not the everyday figure',
        body:
          `These are ceilings. The pack's standard charge current is ${battery.standardChargeA} A, ` +
          `half its ${battery.maxChargeA} A maximum, which is what item 07 above is set from. ` +
          `Under LCBMS the BMS applies its own limit regardless.`,
      },
      {
        title: 'Missing a ceiling means missing a number',
        body:
          input.generatorKw
            ? `The generator figure above assumes the house is drawing nothing. Subtract ` +
              `whatever is actually on when the charger runs, or the generator stalls.`
            : 'No generator kW was given, so that ceiling is listed as not given rather than invented. ' +
              'A 3 kW machine cannot feed a 100 A × 51.2 V charge (about 5 kW) and the house.',
      },
    ],
    sources: [SPH_MANUAL, PACK_MANUAL],
  }
}

export const SPH_WORK_MODES: WorkModeOption[] = [
  {
    id: 'UTI',
    label: 'Mains first (item 01 UTI)',
    when: 'AC-in is the backbone. The pack only carries the house when the grid or generator is gone.',
  },
  {
    id: 'SBU',
    label: 'Solar / battery first (item 01 SBU)',
    when: 'Use PV and the pack; switch to AC-in when the pack is low (item 04 / SOC item 61).',
  },
  {
    id: 'SOL',
    label: 'Solar first (item 01 SOL)',
    when: 'PV first, then AC-in. The pack stays in reserve.',
  },
  {
    id: 'SUB',
    label: 'Solar-priority charge (item 01 SUB)',
    when: 'Charge from PV, mix AC-in onto the load. The pack only carries the house off-grid. This is the factory-shaped backup mode, not a pick.',
  },
]

/** How many of this pack add up to the sized bank. Whole units, rounded up. */
export function parallelCountFor(bankKwh: number | undefined, pack: BatteryPreset): number | undefined {
  if (bankKwh === undefined || !(pack.capacityKwh > 0)) return undefined
  const n = Math.ceil(bankKwh / pack.capacityKwh)
  if (n < 1) return undefined
  return Math.min(n, pack.maxParallel)
}
