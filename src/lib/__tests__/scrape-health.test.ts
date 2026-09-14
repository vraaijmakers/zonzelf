import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assessScrape, formatScrapeHealth, type ScrapeOutcome } from '../scrape-health'

// The two runs that used to exit 0 with nothing to show for themselves. Both
// are what a site redesign looks like from inside the scraper, and both are
// invisible on a schedule unless the run says so itself.

test('discovery finding nothing fails the run', () => {
  const health = assessScrape({ source: 'eg4', discovered: 0, parsed: 0, outcomes: [] })
  assert.equal(health.ok, false)
  assert.match(health.failures.join(' '), /found nothing to scrape/)
})

test('finding candidates but parsing none fails the run', () => {
  const health = assessScrape({ source: 'sungoldpower', discovered: 12, parsed: 0, outcomes: [] })
  assert.equal(health.ok, false)
  assert.match(health.failures.join(' '), /found 12 candidate\(s\) and parsed none/)
})

test('a failed write fails the run', () => {
  const outcomes: ScrapeOutcome[] = ['unchanged', 'failed', 'proposed']
  const health = assessScrape({ source: 'victron', parsed: 3, outcomes })
  assert.equal(health.ok, false)
  assert.match(health.failures.join(' '), /1 of 3 write\(s\) failed/)
})

test('parsing records and writing none fails the run', () => {
  const health = assessScrape({ source: 'eg4', discovered: 4, parsed: 4, outcomes: [] })
  assert.equal(health.ok, false)
  assert.match(health.failures.join(' '), /parsed 4 record\(s\) and wrote none/)
})

// scrape-signaturesolar.ts only ever updates rows scrape-eg4.ts created. If it
// matches none of them the affiliate price silently stops refreshing, which is
// the revenue field going stale with nobody told.
test('an update-only scraper matching no row at all fails the run', () => {
  const outcomes: ScrapeOutcome[] = ['missing', 'missing', 'missing']
  const health = assessScrape({ source: 'signaturesolar', discovered: 3, parsed: 3, outcomes })
  assert.equal(health.ok, false)
  assert.match(health.failures.join(' '), /matched no existing row at all/)
})

test('matching some but not all rows warns, it does not fail', () => {
  const outcomes: ScrapeOutcome[] = ['proposed', 'missing', 'unchanged']
  const health = assessScrape({ source: 'signaturesolar', discovered: 3, parsed: 3, outcomes })
  assert.equal(health.ok, true)
  assert.match(health.warnings.join(' '), /1 record\(s\) matched no existing row/)
})

// The healthy steady state. Specs genuinely do not change most weeks, and a job
// that goes red for that is a job everyone learns to ignore.
test('everything unchanged is healthy and silent', () => {
  const outcomes: ScrapeOutcome[] = ['unchanged', 'unchanged', 'unchanged']
  const health = assessScrape({ source: 'eg4', discovered: 3, parsed: 3, outcomes })
  assert.deepEqual(health, { ok: true, failures: [], warnings: [] })
  assert.deepEqual(formatScrapeHealth({ source: 'eg4', parsed: 3, outcomes }, health), [])
})

test('a proposal against a live row is healthy — that is the gate working', () => {
  const outcomes: ScrapeOutcome[] = ['proposed', 'suppressed', 'inserted']
  const health = assessScrape({ source: 'eg4', discovered: 3, parsed: 3, outcomes })
  assert.equal(health.ok, true)
})

test('one product skipped warns and still passes', () => {
  const outcomes: ScrapeOutcome[] = ['unchanged', 'unchanged']
  const health = assessScrape({ source: 'eg4', discovered: 3, parsed: 2, outcomes })
  assert.equal(health.ok, true)
  assert.match(health.warnings.join(' '), /parsed 2 of 3/)
})

// scrape-victron.ts parses records straight off one page — there is no
// discovery stage to report, so `parsed` has to stand for both.
test('omitting discovered falls back to parsed', () => {
  assert.equal(assessScrape({ source: 'victron', parsed: 0, outcomes: [] }).ok, false)
  assert.equal(assessScrape({ source: 'victron', parsed: 2, outcomes: ['unchanged', 'unchanged'] }).ok, true)
})

test('the report names the scraper and lists every failure', () => {
  const run = { source: 'eg4', discovered: 0, parsed: 0, outcomes: [] as ScrapeOutcome[] }
  const lines = formatScrapeHealth(run, assessScrape(run))
  assert.match(lines[0], /eg4 FAILED/)
  assert.equal(lines.length, 2)
})
