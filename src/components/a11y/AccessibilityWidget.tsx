'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Accessibility, Type, Contrast, Waves, X, RotateCcw } from 'lucide-react'
import { usePersistentState } from '@/lib/calc-storage'

type TextSize = 'normal' | 'large' | 'larger'

interface Prefs {
  textSize: TextSize
  highContrast: boolean
  reduceMotion: boolean
}

const DEFAULT_PREFS: Prefs = { textSize: 'normal', highContrast: false, reduceMotion: false }
const STORAGE_KEY = 'zonzelf:a11y-prefs'

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const [prefs, setPrefs, meta] = usePersistentState<Prefs>(STORAGE_KEY, DEFAULT_PREFS)

  // Reflect the current preference onto <html> so the CSS in globals.css can key off it.
  useEffect(() => {
    if (!meta.hydrated) return
    const html = document.documentElement
    if (prefs.textSize === 'normal') html.removeAttribute('data-a11y-text')
    else html.setAttribute('data-a11y-text', prefs.textSize)

    if (prefs.highContrast) html.setAttribute('data-a11y-contrast', 'high')
    else html.removeAttribute('data-a11y-contrast')

    if (prefs.reduceMotion) html.setAttribute('data-a11y-motion', 'reduce')
    else html.removeAttribute('data-a11y-motion')
  }, [prefs, meta.hydrated])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const reset = () => setPrefs(DEFAULT_PREFS)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div
          role="dialog"
          aria-label="Accessibility options"
          className="mb-3 w-72 rounded-xl border bg-white shadow-xl p-4 text-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">Accessibility options</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close accessibility options"
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div role="group" aria-labelledby="a11y-text-label" className="mb-4">
            <div id="a11y-text-label" className="flex items-center gap-1.5 text-gray-600 mb-2">
              <Type className="w-3.5 h-3.5" /> Text size
            </div>
            <div className="flex gap-2">
              {([
                ['normal', 'A', 'text-xs'],
                ['large', 'A', 'text-sm'],
                ['larger', 'A', 'text-base'],
              ] as [TextSize, string, string][]).map(([size, label, cls]) => (
                <button
                  key={size}
                  onClick={() => setPrefs(p => ({ ...p, textSize: size }))}
                  aria-pressed={prefs.textSize === size}
                  aria-label={`${size} text size`}
                  className={`flex-1 rounded-lg border py-1.5 font-semibold transition-colors ${cls} ${
                    prefs.textSize === size
                      ? 'bg-yellow-500 text-white border-yellow-500'
                      : 'border-gray-200 hover:border-yellow-300 text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-gray-600">
              <Contrast className="w-3.5 h-3.5" /> High contrast
            </span>
            <button
              onClick={() => setPrefs(p => ({ ...p, highContrast: !p.highContrast }))}
              aria-pressed={prefs.highContrast}
              aria-label="Toggle high contrast"
              className={`relative w-9 h-5 rounded-full transition-colors ${
                prefs.highContrast ? 'bg-yellow-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  prefs.highContrast ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center gap-1.5 text-gray-600">
              <Waves className="w-3.5 h-3.5" /> Reduce motion
            </span>
            <button
              onClick={() => setPrefs(p => ({ ...p, reduceMotion: !p.reduceMotion }))}
              aria-pressed={prefs.reduceMotion}
              aria-label="Toggle reduced motion"
              className={`relative w-9 h-5 rounded-full transition-colors ${
                prefs.reduceMotion ? 'bg-yellow-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  prefs.reduceMotion ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <button
              onClick={reset}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
            <Link href="/accessibility" className="text-xs text-yellow-700 hover:underline">
              Full statement →
            </Link>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close accessibility options' : 'Open accessibility options'}
        aria-expanded={open}
        className="w-12 h-12 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg flex items-center justify-center transition-colors"
      >
        <Accessibility className="w-6 h-6" />
      </button>
    </div>
  )
}
