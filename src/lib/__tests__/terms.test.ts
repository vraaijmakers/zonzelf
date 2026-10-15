import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  TERMS_LAST_UPDATED,
  TERMS_VERSION,
  isCurrentTermsVersion,
  termsAccess,
} from '../terms'
import { shippedProtection } from '../calc-register'
import { CALC_STEPS } from '../calc-steps'

test('a visitor with no account is anonymous whatever else is passed', () => {
  assert.equal(termsAccess(null, []), 'anonymous')
  assert.equal(termsAccess(null, [TERMS_VERSION]), 'anonymous')
})

test('an account that never agreed is asked to', () => {
  assert.equal(termsAccess('user-1', []), 'needs-acceptance')
})

test('agreeing to an earlier version is not agreeing to this one', () => {
  assert.equal(termsAccess('user-1', ['2026-09-08']), 'needs-acceptance')
})

test('agreeing to the current version grants access', () => {
  assert.equal(termsAccess('user-1', ['2026-09-08', TERMS_VERSION]), 'granted')
})

test('only the current version is recorded from a sign-up link', () => {
  assert.equal(isCurrentTermsVersion(TERMS_VERSION), true)
  assert.equal(isCurrentTermsVersion('2026-09-08'), false)
  assert.equal(isCurrentTermsVersion(''), false)
  assert.equal(isCurrentTermsVersion(null), false)
})

test('the printed date and the recorded version are the same day', () => {
  const printed = new Date(`${TERMS_LAST_UPDATED} UTC`).toISOString().slice(0, 10)
  assert.equal(printed, TERMS_VERSION)
})

// The gate is a server check in each page.tsx. A calculator step that renders
// without asking is the failure this whole layer exists to prevent, so a new
// step that forgets the check fails here rather than in production.
test('every calculator step checks terms access and renders the gate', () => {
  const pages = CALC_STEPS.flatMap(s => (s.href ? [s.href] : []))
  assert.equal(pages.length, CALC_STEPS.length)
  for (const page of pages) {
    const source = readFileSync(new URL(`../../app${page}/page.tsx`, import.meta.url), 'utf8')
    assert.match(source, /getTermsAccess\(\)/, `${page} does not check terms access`)
    assert.match(source, /<TermsGate /, `${page} does not render the gate`)
    assert.doesNotMatch(source, /^'use client'/, `${page} must stay a Server Component`)
  }
})

// Belt and braces: every page the register says carries a protection output is
// one of those steps.
test('every protection output lives on a gated calculator step', () => {
  const steps = new Set(CALC_STEPS.map(s => s.href))
  for (const o of shippedProtection()) {
    assert.ok(steps.has(o.page), `${o.id} is on ${o.page}, which is not a calculator step`)
  }
})
