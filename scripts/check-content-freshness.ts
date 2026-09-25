// Which written claims are overdue for somebody to re-read them?
//
// The guides assert things that can stop being true without this repo
// changing: which NEC edition deleted 690.47(B), what a 400 W module weighs,
// which standards we have and have not opened. Nothing noticed when one went
// stale, because nothing was tracking when a human last looked. src/lib/
// content-freshness.ts is that tracking; this is the half that nags.
//
// Needs no database, no credentials and no network, so it runs in CI on a
// public repo — the same constraint that shapes check-roadmap-migrations.ts.
// It cannot tell you whether a claim is still TRUE. It tells you nobody has
// checked in a while, which is the only part a script can honestly assert.
//
// Exit codes are what .github/workflows/content-freshness.yml reads:
//   0  nothing overdue
//   1  something is due or stale
//   2  the registry itself is broken (an unparseable date)

import { claimFreshness, needsReview, mustCaveat, CADENCE_FOR } from '../src/lib/content-freshness'
import { allClaims } from '../src/lib/guide-claims'

/** "16 Sep 2026" — matches formatAsOf in battery-price.ts, day before month. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmt(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** Markdown, because the workflow pastes this straight into a GitHub issue. */
function main() {
  // FRESHNESS_NOW exists so the report's own output can be checked without
  // waiting a year for a claim to lapse — an alarm nobody has ever seen fire
  // is an alarm nobody knows the shape of. Test-only; CI sets nothing.
  const override = process.env.FRESHNESS_NOW
  const now = override ? new Date(override) : new Date()
  if (Number.isNaN(now.getTime())) {
    console.error(`FRESHNESS_NOW="${override}" is not a date.`)
    process.exit(2)
  }
  const rows = allClaims().map(({ guide, claim }) => ({
    guide, claim, freshness: claimFreshness(claim, now),
  }))

  const broken = rows.filter(r => r.freshness.kind === 'unknown')
  const superseded = rows.filter(r => r.freshness.kind === 'superseded')
  const stale = rows.filter(r => r.freshness.kind === 'stale')
  const due = rows.filter(r => r.freshness.kind === 'due')
  const flagged = rows.filter(r => needsReview(r.freshness))

  const lines: string[] = []
  const say = (s = '') => lines.push(s)

  if (flagged.length === 0) {
    say(`All ${rows.length} registered claim(s) across ${new Set(rows.map(r => r.guide.slug)).size} guide(s) are within their review interval.`)
    say()
    const next = rows
      .map(r => ({ r, due: r.freshness.kind === 'current' ? r.freshness.dueInDays : 0 }))
      .sort((a, b) => a.due - b.due)[0]
    if (next) {
      say(`Next due: \`${next.r.guide.slug}\` / \`${next.r.claim.id}\` in ${next.due} day(s).`)
    }
    console.log(lines.join('\n'))
    process.exit(0)
  }

  say(`**${flagged.length} claim(s)** need a human to re-read them against their source.`)
  say()
  say('Nothing here says a claim is wrong — only that nobody has confirmed it recently.')
  say('Re-read it, then set `checkedOn` to today in `src/lib/guide-claims.ts`. If it changed,')
  say('fix the guide in the same commit.')
  say()

  const section = (title: string, group: typeof rows, why: string) => {
    if (group.length === 0) return
    say(`### ${title}`)
    say()
    say(why)
    say()
    for (const { guide, claim, freshness } of group) {
      const cadence = CADENCE_FOR[claim.kind]
      const detail =
        freshness.kind === 'superseded'
          ? `its stated change date (${fmt(claim.changesOn!)}) has passed`
          : freshness.kind === 'unknown'
            ? `\`checkedOn\` is "${claim.checkedOn}", which is not a YYYY-MM-DD date`
            : `${freshness.ageDays} days old, ${'overdueDays' in freshness ? freshness.overdueDays : 0} past the ${cadence.warn}-day ${claim.kind} interval`
      say(`- **\`/guides/${guide.slug}\`** — \`${claim.id}\` (${detail})`)
      say(`  > ${claim.statement}`)
      say(`  Source: ${claim.source}${claim.sourceUrl ? ` — ${claim.sourceUrl}` : ''}`)
      if (freshness.kind !== 'unknown') say(`  Last checked: ${fmt(claim.checkedOn)}`)
      say()
    }
  }

  section(
    'Superseded — a published change date has passed',
    superseded,
    'These are not guesses about decay. The source itself said the ground would move on this date, and it has. **The page is already showing a caveat to readers.**',
  )
  section(
    'Stale — the page is caveating this to readers',
    stale,
    'Past the second threshold, so the guide no longer states these plainly. Re-reading the source removes the caveat.',
  )
  section(
    'Due — asking quietly, the page still reads normally',
    due,
    'Past the first threshold only. Visitors see nothing different yet; this is the window to answer before they do.',
  )
  section(
    'Broken registry entries',
    broken,
    'These dates do not parse, so no freshness can be computed. Treated as unverified on the page.',
  )

  const caveating = rows.filter(r => mustCaveat(r.freshness)).length
  say('---')
  say(`<sub>${rows.length} claim(s) registered · ${flagged.length} flagged · ${caveating} currently caveated on the site. Raised by \`scripts/check-content-freshness.ts\`.</sub>`)

  console.log(lines.join('\n'))
  process.exit(broken.length > 0 ? 2 : 1)
}

main()
