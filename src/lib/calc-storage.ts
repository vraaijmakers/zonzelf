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
  /** Total appliance consumption, before system losses. */
  rawKwh: number
  /** System efficiency the load calculator was set to (0.6–0.95). */
  efficiency: number
  /** rawKwh / efficiency — what the system actually has to deliver. */
  adjustedKwh: number
}

/** The result the load calculator last published, or null if it was never used. */
export function useLoadSummary(): LoadSummary | null {
  const [summary] = usePersistentState<LoadSummary | null>(LOAD_SUMMARY_KEY, null)
  return summary
}

export function publishLoadSummary(summary: LoadSummary) {
  writeStored(LOAD_SUMMARY_KEY, summary)
}

export const round2 = (n: number) => Math.round(n * 100) / 100
