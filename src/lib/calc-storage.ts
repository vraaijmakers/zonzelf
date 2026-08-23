'use client'

import { useCallback, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'

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
  breakdown?: { always: number; daytime: number; evening: number; total: number }
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
}

export const BATTERY_SUMMARY_KEY = 'zonzelf:battery:summary'

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

export const round2 = (n: number) => Math.round(n * 100) / 100
