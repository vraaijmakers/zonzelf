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
import { ACCOUNT_STEPS, stepById } from '../calc-steps'

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

// The gate is a server check in each page.tsx. A protection output on a page
// that never asks is the failure this whole layer exists to prevent, so a new
// protection page that forgets the check fails here rather than in production.
test('every page that carries a protection output checks terms access', () => {
  const pages = new Set(shippedProtection().map(o => o.page))
  assert.ok(pages.size > 0)
  for (const page of pages) {
    const source = readFileSync(new URL(`../../app${page}/page.tsx`, import.meta.url), 'utf8')
    assert.match(source, /getTermsAccess\(\)/, `${page} does not check terms access`)
    assert.doesNotMatch(source, /^'use client'/, `${page} must stay a Server Component`)
  }
})

test('every step advertised as needing an account is a wholly gated page', () => {
  for (const id of ACCOUNT_STEPS) {
    const { href } = stepById(id)
    assert.ok(href, `${id} has no page`)
    const source = readFileSync(new URL(`../../app${href}/page.tsx`, import.meta.url), 'utf8')
    assert.match(source, /<TermsGate /, `${href} does not render the gate`)
  }
})
