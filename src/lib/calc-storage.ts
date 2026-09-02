'use client'

import { useCallback, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'
import type { LoadProfile } from './appliance-load'

const listeners = new Map<string, Set<() => void>>()

function subscribe(key: string, onChange: () => void) {
  let forKey = listeners.get(key)
  if (!forKey) {
    forKey = new Set()
    listeners.set(key, forKey)
  }
  forKey.add(onChange)

  // Keep other tabs in sync too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === key) onChange()
  }
  window.addEventListener('storage', onStorage)

  return () => {
    forKey.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

function notify(key: string) {
  listeners.get(key)?.forEach(fn => fn())
}

// useSyncExternalStore requires a referentially stable snapshot, so parsed
// values are cached until the underlying string actually changes.
const cache = new Map<string, { raw: string | null; parsed: unknown }>()

function readStored(key: string): unknown {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(key)
  } catch {
    // Storage unavailable (private mode, blocked cookies) — behave as unset.
  }

  const cached = cache.get(key)
  if (cached && cached.raw === raw) return cached.parsed

  let parsed: unknown = undefined
  if (raw !== null) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = undefined // Corrupt entry — fall back to the default.
    }
  }
  cache.set(key, { raw, parsed })
  return parsed
}

function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota or private mode — the calculator still works, it just won't persist.
  }
  notify(key)
}

/** Nothing is stored during a server render, so every page renders its defaults. */
const serverSnapshot = () => undefined

const subscribeToHydration = () => () => {}

interface PersistMeta {
  /** False during SSR and the hydration render, true once storage has been read. */
  hydrated: boolean
  /** A previously saved value exists and is being used instead of the default. */
  restored: boolean
}

/**
 * useState backed by localStorage, so calculator input survives navigating
 * between the calculators and closing the tab.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const stored = useSyncExternalStore(
    useCallback(onChange => subscribe(key, onChange), [key]),
    useCallback(() => readStored(key), [key]),
    serverSnapshot,
  )
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false)

  const value = (stored === undefined ? initial : stored) as T

  const setValue: Dispatch<SetStateAction<T>> = useCallback(update => {
    const current = readStored(key)
    const previous = (current === undefined ? initial : current) as T
    const next = typeof update === 'function'
      ? (update as (prev: T) => T)(previous)
      : update
    writeStored(key, next)
    // `initial` is a module-level constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
    notify(key)
  }, [key])

  const meta: PersistMeta = { hydrated, restored: hydrated && stored !== undefined }

  return [value, setValue, meta, clear] as const
}

/**
 * The appliance rows themselves, not a summary of them.
 *
 * Shared because the inverter step edits one field of them — the start-up
 * multiple — and a surge factor belongs to the appliance, not to whichever
 * page happens to be showing it. Both pages read and write the same key, and
 * the store notifies listeners, so they stay in step.
 */
export interface StoredAppliance {
  id: number
  name: string
  /** Draw while actually running, not the daily average. */
  watts: number
  /** Hours per day the appliance is in service. */
  hours: number
  qty: number
  /** Fraction of those hours it actually draws power. Absent means 100%. */
  duty?: number
  /** When it runs — drives the battery scenarios. Absent means all day. */
  profile?: LoadProfile
  /** Multiple of `watts` drawn at start-up. Absent means 1x. */
  surge?: number
}

export const LOAD_APPLIANCES_KEY = 'zonzelf:load:appliances'

/**
 * The starter list, shared by every page that reads the appliance rows.
 *
 * Shared rather than owned by the load page because a default that only one
 * page knows about is a disagreement waiting to happen: nothing is written to
 * storage until the user actually edits something, so a visitor who opens the
 * load calculator, reads it and moves on has four appliances on one page and
 * an empty list on the next. Same failure as rule 12b in CLAUDE.md — the seed
 * data and the page have to agree.
 *
 * The surge factors here must match the presets of the same name in
 * appliance-load.ts, or a fresh visit fires a correction chip against seed
 * data we wrote ourselves.
 */
export const DEFAULT_APPLIANCES: StoredAppliance[] = [
  { id: 1, name: 'LED light bulb', watts: 10, hours: 5, qty: 4, profile: 'evening' },
  { id: 2, name: 'Ceiling fan',    watts: 60, hours: 8, qty: 1, surge: 2 },
  { id: 3, name: 'Laptop',         watts: 65, hours: 6, qty: 1 },
  { id: 4, name: 'Mini fridge',    watts: 80, hours: 24, qty: 1, duty: 0.30, surge: 3 },
]

export const LOAD_SUMMARY_KEY = 'zonzelf:load:summary'

export interface LoadSummary {
  /** Total appliance consumption at the socket, before any losses. */
  rawKwh: number
  /**
   * Inverter + wiring efficiency, DC to AC. Named `efficiency` for
   * compatibility with summaries saved before the loss stages were separated;
   * it has always been this stage in practice. See src/lib/system-efficiency.ts.
   */
  efficiency: number
  /** rawKwh / efficiency — what the battery has to deliver. */
  adjustedKwh: number
  /**
   * Daily kWh split by when each appliance runs. Absent on summaries saved
   * before profiles existed; the battery page falls back to a flat assumption
   * rather than pretending it knows.
   */
  breakdown?: {
    always: number
    daytime: number
    evening: number
    /** Added when cooling and heating became distinct classes; absent on older summaries. */
    cooling?: number
    heating?: number
    total: number
  }
  /**
   * Every load running at the same moment, watts. Absent on summaries saved
   * before the inverter step existed — the inverter page recomputes from the
   * appliance rows in that case rather than assuming a zero.
   */
  peakConcurrentW?: number
  /** peakConcurrentW plus the single hardest start-up. Absent on older summaries. */
  surgeW?: number
}

/**
 * What the battery calculator publishes so panel sizing can use the real
 * chemistry's round-trip efficiency instead of a generic default. Absent until
 * the user has visited the battery calculator.
 */
export interface BatterySummary {
  chemistry: string
  /** Energy out divided by energy in, for the selected chemistry. */
  roundTrip: number
  /** Depth of discharge the bank was sized against. */
  dod: number
  /**
   * The bank the user actually settled on, kWh. Absent on summaries saved
   * before the system page existed — it published only what the PANEL step
   * needed (chemistry and round trip), which meant nothing downstream could
   * say how big the battery was. The system page needs the answer, not just
   * the inputs to it.
   */
  bankKwh?: number
  /** Amp-hours at the chosen system voltage. */
  bankAh?: number
  /** Days of autonomy the bank was sized for. */
  autonomyDays?: number
  /** Nominal DC voltage the bank runs at. */
  systemVoltage?: number
  /** Which scenario the figure came from, e.g. 'overnight' or 'sunless days'. */
  scenarioLabel?: string
  /** Low and high end of the scenario band, kWh — the honest spread. */
  bandMinKwh?: number
  bandMaxKwh?: number
}

export const BATTERY_SUMMARY_KEY = 'zonzelf:battery:summary'

/**
 * What the panel calculator publishes so the battery page can check whether
 * the array actually refills the bank. Absent until the user has visited
 * the panel calculator.
 */
export interface PanelSummary {
  peakSunHours: number
  worstMonthHours: number
  worstMonthName: string
  /** Installed nameplate watts after rounding up to a whole number of panels. */
  arrayWatts: number
  arrayDerate: number
  panelWatt: number
  panels: number
}

export const PANEL_SUMMARY_KEY = 'zonzelf:panels:summary'

/**
 * The unit chosen at the inverter step, and every PV specification the array
 * step needs to design a string against it.
 *
 * This is the summary that changed the order of the chain. A string cannot be
 * designed without a tracker's voltage window, so the array step is blocked
 * until this exists — and that is the honest answer to give, rather than
 * sizing an arrangement against a default nobody chose.
 */
export interface InverterSummary {
  /** Present when the unit came from the preset list rather than typed in. */
  brand?: string
  model?: string
  acContinuousW: number
  acSurgeW: number
  dcSystemVoltage: number
  /** The damage ceiling. A string's cold Voc is checked against this. */
  pvMaxInputV: number
  mpptMinV: number
  mpptMaxV: number
  mpptStartV?: number
  mpptCount: number
  pvMaxPowerW: number
  pvMaxCurrentA: number
  pvMaxIscA?: number
  maxChargeCurrentA?: number
  /** Manufacturer datasheet, when the unit came from the preset list. */
  sourceUrl?: string
}

export const INVERTER_SUMMARY_KEY = 'zonzelf:inverter:summary'

/** The result the load calculator last published, or null if it was never used. */
export function useLoadSummary(): LoadSummary | null {
  const [summary] = usePersistentState<LoadSummary | null>(LOAD_SUMMARY_KEY, null)
  return summary
}

export function publishLoadSummary(summary: LoadSummary) {
  writeStored(LOAD_SUMMARY_KEY, summary)
}

/** The chemistry the battery calculator last used, or null if never visited. */
export function useBatterySummary(): BatterySummary | null {
  const [summary] = usePersistentState<BatterySummary | null>(BATTERY_SUMMARY_KEY, null)
  return summary
}

export function publishBatterySummary(summary: BatterySummary) {
  writeStored(BATTERY_SUMMARY_KEY, summary)
}

export function usePanelSummary(): PanelSummary | null {
  const [summary] = usePersistentState<PanelSummary | null>(PANEL_SUMMARY_KEY, null)
  return summary
}

export function publishPanelSummary(summary: PanelSummary) {
  writeStored(PANEL_SUMMARY_KEY, summary)
}

/**
 * The arrangement chosen at the array step. Published for the cable step,
 * which needs the array's design current and can pre-set its circuit type.
 */
export interface ArraySummary {
  series: number
  parallel: number
  panels: number
  arrayWatts: number
  /** String voltage at the design low. The number that destroys inverters. */
  vocColdV: number
  /** String working voltage at the design high. */
  vmpHotV: number
  /** Design current into the worst-loaded tracker, after NEC 690.8(A)(1)'s 125%. */
  designIscA: number
  /**
   * ONE panel's short-circuit current, raw — no code factor applied.
   *
   * Carried separately from designIscA on purpose. The cable step applies its
   * own 156% for a PV source circuit, so handing it the already-multiplied
   * figure would apply the factor twice and oversize everything.
   */
  panelIscA: number
  /** Strings on the worst-loaded tracker, for sizing the combiner run. */
  stringsPerTracker: number
  designLowC: number
  designHighC: number
  /** Null when the panel's max series fuse rating was not entered. */
  stringFuseRequired: boolean | null
}

export const ARRAY_SUMMARY_KEY = 'zonzelf:array:summary'

export function useArraySummary(): ArraySummary | null {
  const [summary] = usePersistentState<ArraySummary | null>(ARRAY_SUMMARY_KEY, null)
  return summary
}

export function publishArraySummary(summary: ArraySummary) {
  writeStored(ARRAY_SUMMARY_KEY, summary)
}

/** The inverter chosen at step 3, or null until that step has been used. */
export function useInverterSummary(): InverterSummary | null {
  const [summary] = usePersistentState<InverterSummary | null>(INVERTER_SUMMARY_KEY, null)
  return summary
}

export function publishInverterSummary(summary: InverterSummary) {
  writeStored(INVERTER_SUMMARY_KEY, summary)
}

export const round2 = (n: number) => Math.round(n * 100) / 100
