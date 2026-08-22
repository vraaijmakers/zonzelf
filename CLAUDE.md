# CLAUDE.md — ZonZelf (Next.js + Supabase)

**This file is your persistent system prompt.** Claude Code reads it automatically in every
session. Follow it strictly. It overrides defaults.

@AGENTS.md

---

## Project Overview

**ZonZelf** — *Your solar system, built by you.*
Dutch: *zon* (sun) + *zelf* (self), rooted in *doe-het-zelf* (DIY).

A community platform for DIY off-grid and hybrid solar builders: plain-English guides,
sizing calculators, brand-agnostic live monitoring, and project management — for people who
do **not** have an engineering degree.

| | |
|---|---|
| Domains | `zonzelf.com` · `zonzelf.app` (Cloudflare, registered 2026-08-19) |
| Repo | `github.com/vraaijmakers/zonzelf` (public) |
| Owner | Vincent Raaijmakers |
| Started | 2026-08-19 |
| App root | `zonzelf-app/` (this directory — also the git root) |
| Project docs | `../PROJECT.md`, `../website/`, `../knowledge-base/`, `../neighbor-build/` |

**Two tracks.** Track 1 is the neighbor's actual build (personal, documented in
`../neighbor-build/`). Track 2 is this public platform. Don't confuse them — Track 1 is a
source of real-world requirements, not a feature list.

---

## The Blue Ocean Contract

**This is the scope gate. Read it before agreeing to build anything.**

The competitive analysis was explicit: this is **not** a true blue ocean. Every individual
piece already exists — DIY Solar Forum has the community, Solar Assistant and Monitor My
Solar have monitoring, SolarCalcu has calculators, Victron VRM has dashboards. The gap is
that **nobody covers the full lifecycle in one beginner-friendly, brand-agnostic place**:

```
Design → Learn → Calculate → Install → Monitor → Maintain
```

### The three differentiators — the only real moat

1. **Guided onboarding for beginners.** Every competitor assumes you already know what MPPT,
   DoD, and AWG mean. We explain them. Plain English is the product.
2. **Brand-agnostic monitoring with no proprietary hardware.** Solar Assistant needs their
   $149 dongle; Victron VRM only speaks Victron. A software agent (Python on a Pi/PC, MODBUS)
   that works with any inverter is the genuine gap.
3. **Community data aggregation.** *"Systems like yours in Arizona averaged 5.2 peak sun hours
   in July."* Nobody has this layer because nobody has the users reporting into it.

### The feature-creep test

Before building any feature, answer in one sentence: **which of the three differentiators does
this strengthen?** If the answer is "none," it does not get built — no matter how good the idea
is. Say so out loud and put it in the roadmap as `planned` at low priority instead.

The closest competitive threat is Monitor My Solar. They are monitoring-only, with no learning
or community angle. Every hour spent on something that is not one of the three above is an hour
that lets them close the gap.

### Non-goals — do not build these

- Selling components / e-commerce
- Professional installer marketplace
- Grid utility integrations
- Anything requiring ZonZelf-branded hardware (this contradicts differentiator #2)
- A general-purpose home-automation platform (that is Home Assistant's job)

### Monetization — revised 2026-08-22

> The previous version of this section made freemium monitoring (~$5–9/mo) the primary
> recurring revenue and called everything else a "Phase 2+ distraction." Tested against
> market comparables, that was backwards. Superseded.

**Affiliate plus content is the primary revenue line.** Direct solar programs pay 5–6%
(Renogy 6%, A1 6%, Bluetti 5–10%); ~6% of one $1,200 battery beats nine months of a $7
subscription. Display advertising is the second line. Modeled at a realistic year-3 steady
state (~40k sessions/mo), affiliate and ads together are roughly 85% of revenue.

**Monitoring is free.** It is a retention and differentiation feature, not a revenue engine.
That is not a concession — it is the original argument followed through: monitoring earns its
place by creating daily active users, and daily active users are what make affiliate and
content revenue work. Three things killed the subscription:

1. **The incumbent is cheaper.** Solar Assistant charges $59 once plus $30/yr for updates.
   $5–9/mo is $60–108/yr — 2–4× the price, from a newcomer with less trust.
2. **Differentiator #2 destroys its own collectability.** Solar Assistant's $149 dongle *is*
   their moat. An open Python MODBUS agent is forkable in an afternoon and repointable at
   self-hosted Grafana or Home Assistant. ZonZelf cannot advertise "no lock-in" and bill a
   subscription that depends on lock-in.
3. **It is the only stream that meaningfully escalates liability** and support burden, while
   being the smallest of the three.

Paid tiers are not forbidden — they are **unproven**. Do not build billing, gating, or
"Pro" UI until there is evidence users will pay. (Note that `/api/scan-label` already
pretends to be Pro-gated with `const isPro = false` while the API itself is wide open; that
is a phase-0 security item, not the start of a paid tier.)

### Legal posture — the rule that governs calculator design

**Entity: US LLC. Audience: US-first. Governing code: NEC 310.16.**

US product-liability law splits on whether information is a "product," and ZonZelf straddles
the line:

- `Winter v. G.P. Putnam's Sons`, 938 F.2d 1033 (9th Cir. 1991) — a mushroom encyclopedia
  that poisoned its readers. Held: **the informational content of a book is not a product**,
  and **publishers owe no general duty to verify accuracy.** Guides, glossary, and resources
  sit here.
- `Saloomey v. Jeppesen`, `Brocklesby`, `Fluor` — aeronautical charts **were** products,
  because a chart mechanically converts data into an output acted on directly in a hazardous
  activity. *Winter* distinguished these rather than overruling them.

> **The rule: guides teach; calculators must show the derivation and cite the code. Never
> emit a bare authoritative recommendation.**

"Recommended gauge: AWG 10" in large green type is the chart, not the book. Show the code
table, show the arithmetic, cite the source, teach the user to derive the answer. This is
**permanent design**, not a holding pattern until the electrician sign-off lands — and it is
differentiator #1 executed properly, so the liability fix and the product goal are the same
move. A bigger disclaimer is not a substitute: a footer link is weak evidence of assent, and
US courts have struck down all-encompassing waivers as overbroad.

GDPR still applies to EU visitors even with a US entity — the live signup with no deletion
path, and household photos going to Anthropic via `/api/scan-label`, are real findings today.
The EU Product Liability Directive (2024/2853, software-as-product, strict liability,
transposition due 9 Dec 2026) is out of scope for a US entity, but would return if EU users
were ever commercially *targeted*.

---

## Tech Stack & Environment

- **Next.js 16.3.1** (App Router) + **React 19.2.8** + **TypeScript 5** (strict)
- **Tailwind CSS v4** (`@tailwindcss/postcss`) + **shadcn** + Base UI (`@base-ui/react`)
- **Supabase** — Postgres, Auth, RLS, storage (`@supabase/supabase-js`, `@supabase/ssr`)
- **Anthropic SDK** (`@anthropic-ai/sdk`) — currently powering `/api/scan-label`
- **lucide-react** icons · `clsx` + `tailwind-merge` via `cn()` in `src/lib/utils.ts`
- Hosting: **TBD** — not yet set up anywhere. A self-hosted Docker staging instance is
  planned on the seecago.com VPN box (same pattern as the BOND platform: shared nginx
  reverse proxy, container on the `webapps-docker` network, VPN-only — no public
  reachability). No production host chosen yet. **Do not write "Vercel" here again without
  it actually being configured** — it was previously listed as hosting with nothing behind
  it (no `.vercel` dir, no deploy step in CI, no linked account) and misled a session.
- CI: GitHub Actions (`ci.yml` — lint + build on every push/PR). Staging deploys
  automatically on push to `staging` via `deploy-staging.yml`, run by a self-hosted runner
  ("zonzelf-staging") on the seecago.com VPN box. See that workflow file's header comment
  for one-time runner setup, and `docker-compose.staging.yml`'s header for the app
  container / reverse-proxy details.

> **Next.js 16 is not the Next.js in your training data.** `AGENTS.md` is imported above and
> is non-negotiable: read `node_modules/next/dist/docs/` before writing routing, caching,
> params, or layout code. `LayoutProps<"/">` in `src/app/layout.tsx` is a v16 generated type,
> not a mistake — do not "fix" it into a hand-written interface.

When working with the Anthropic SDK, model IDs, pricing, or prompt caching, **invoke the
`claude-api` skill** rather than answering from memory.

---

## Architecture & Project Structure

```
zonzelf-app/
├── CLAUDE.md               # this file
├── AGENTS.md               # Next.js 16 agent rules (auto-generated — commit changes with your work)
├── VERSION                 # single source of truth for the version number
├── src/
│   ├── app/
│   │   ├── layout.tsx      # root layout — Navbar + Footer + fonts
│   │   ├── globals.css     # Tailwind v4 theme + design tokens
│   │   ├── page.tsx        # landing page
│   │   ├── guides/         # knowledge base (public)
│   │   ├── calculators/    # load, battery, panels, awg (public)
│   │   └── api/
│   │       └── scan-label/ # Anthropic vision — component label OCR (Pro-gated)
│   ├── components/
│   │   ├── layout/         # Navbar, Footer
│   │   └── ui/             # shadcn primitives — badge, button, card, navigation-menu, separator
│   └── lib/
│       ├── supabase.ts     # browser client
│       ├── calc-storage.ts # calculator state persistence
│       ├── version.ts      # clean() / full() / appEnv()
│       └── utils.ts        # cn()
└── public/
```

**Planned, not yet built** (see the roadmap board before starting any of it):
`/dashboard` (user projects), `/monitoring` (live inverter data), `/api/ingest` (agent
telemetry), `/api/scrape` (content aggregation).

`/admin` **is** built — `src/app/admin/` has the gated layout, the roadmap board, and the
battery review queue, with Server Actions in `actions.ts` files that each re-check
`requireAdmin()`. The tree above is abridged; read the directory rather than trusting it.

### The admin portal

ZonZelf needs an operator portal, not just a user dashboard. It is the control room for the
services that run the business: scraper source health and review queue, SEO evaluation,
membership and subscription state, payment reconciliation, the roadmap board, and error/issue
triage. Everything under `/admin` is operator-only and must be gated by a Supabase role check
in a server component or route handler — **never by hiding a nav link**.

---

## Design System — the tokens are locked

> Locked 2026-08-20 from the shipped landing page. Do not introduce new colors, fonts, or
> spacing outside this vocabulary. Extending the system is a deliberate decision, not a
> side effect of building a feature.

### Current state — known debt, fix before extending

Three things are wrong today and every new view makes them worse:

1. **`--font-sans` is circular, so Geist never loads.** `src/app/globals.css:10` declares
   `--font-sans: var(--font-sans)` — a self-reference — while `layout.tsx` defines the font as
   `--font-geist-sans`. Nothing else in `src/` or `node_modules/shadcn/tailwind.css` defines
   `--font-sans`, and the circular declaration ships verbatim into the compiled CSS
   (verified in `.next/**/*.css`). It is invalid at computed-value time, so `html { @apply
   font-sans }` resolves to nothing and the site falls back to the browser default **serif**.
   The serif look in `../screenshots/*.png` is that bug, not a design choice. Fix is one line
   — `--font-sans: var(--font-geist-sans)` — but decide deliberately first whether ZonZelf is
   a serif or a sans brand, because the shipped screenshots are the serif version.
2. **The shadcn tokens are still default grayscale.** `--primary`, `--accent`, `--ring` etc.
   are all `oklch(… 0 0)` — zero chroma. The actual brand lives in ad-hoc utility classes.
3. **The brand is applied by hand.** ~90 scattered `yellow-*` and ~130 `gray-*` utility class
   usages across `src/`. There is no single place to change the gold.

### Token vocabulary

Brand tokens are named `--zon-*`. shadcn primitives (`--primary`, `--card`, …) must be defined
**in terms of** `--zon-*` tokens, so there is exactly one source of truth.

**Sun gold — the accent. Gold is an accent, not a fill:**
`--zon-gold` (primary action, currently `yellow-500`) · `--zon-gold-deep` (`yellow-600`, hover)
· `--zon-gold-light` (`yellow-400`, rings/borders) · `--zon-gold-tint` (`yellow-50`, icon
chips and soft surfaces)

**Night — dark sections, headings, the monitoring CTA band:**
`--zon-night` (deep navy, the dark CTA background) · `--zon-night-soft`

**Ink / text:** `--zon-ink` (headings) · `--zon-body` (paragraph) · `--zon-muted` (captions,
labels)

**Surface:** `--zon-paper` (white) · `--zon-cream` (warm hero wash) · `--zon-rule` (borders) ·
`--zon-rule-soft`

**State:** `--zon-green` (healthy / charging) · `--zon-amber` (warning) · `--zon-red` (fault /
destructive) · `--zon-blue` (informational). Each needs a matching `-tint` for badge
backgrounds.

Monitoring is a data product, so state colors carry real meaning: **green = healthy, amber =
attention, red = fault.** Never use them decoratively.

### Rules

- **Never hard-code a hex value, and never reach for a raw Tailwind color scale in a new
  component.** Use the token. If the token you need doesn't exist, that's a design decision —
  raise it, don't invent a shade.
- Gold is an accent. Primary buttons and small chips, not large fills.
- Light and dark must both be defined. The `.dark` block in `globals.css` is not optional.
- Every chart, gauge, and stat tile goes through the **`dataviz` skill** before the first line
  of chart code. Monitoring is the core of the product; its visuals must read as one system.
- New surfaces reuse `src/components/ui/` primitives. Don't hand-roll a card or a badge.

### Voice & copy

Plain English, always — that is differentiator #1, expressed as words. **Warm, practical,
never condescending. Explain the jargon the first time it appears on a page.**

- ✗ "Configure DoD threshold" → ✓ "How deep do you want to drain the battery?"
- ✗ "Insufficient data" → ✓ "No readings yet — check that your agent is running."
- ✗ "Error 500" → ✓ "That didn't save. Here's what went wrong:"

The Dutch *doe-het-zelf* angle is the brand's warmth. Use it in taglines and empty states, not
as constant punning.

---

## Branch → Environment → Version

### Current state

The repo has **one branch (`main`) and 7 commits, all pushed straight to `main`.** There is no
`develop`, no CI, no protection. That stops now.

### Branch map

| Branch | `APP_ENV` | Version shown | Purpose |
|---|---|---|---|
| `feature/*` | `development` | `0.x.x-dev` | One feature or fix, cut from `develop` |
| `develop` | `development` | `0.x.x-dev` | Integration — all feature PRs land here |
| `staging` | `staging` | `0.x.x-rc` | Self-hosted staging (VPN-only) / pre-release QA |
| `main` | `production` | `0.x.x` | Production only — `zonzelf.com` |

**Know which branch an environment deploys.** BOND lost days to work that looked "vanished"
on staging but had simply never been merged to the branch staging deploys.

### Semantic versioning

`VERSION` at the repo root is the single source of truth. `MAJOR.MINOR.PATCH`, bumped exactly
once per release, in the `develop → staging` PR, committed as
`chore(release): bump version to 0.2.0`.

| Change | Bump |
|---|---|
| Breaking change or major redesign | MAJOR |
| New feature, backwards-compatible | MINOR |
| Bug fix or small improvement | PATCH |

`src/lib/version.ts` reads `VERSION` directly off disk at request time — **server-only**, only
import it from Server Components, Server Actions, or Route Handlers. It exposes `clean()`
(`0.2.0`, public footer), `full()` (`0.2.0-dev`/`-rc`, admin screens), and `appEnv()`.
Environment comes from `APP_ENV`, falling back to Vercel's `VERCEL_ENV` (`preview` → staging).
**Never let an env suffix reach a public page** — the footer uses `clean()`.

Deliberately does **not** go through `next.config.ts`'s `env` key. That key is documented as
build-time bundle text-replacement (Next's own docs mark it `version: legacy`) — it never sets
a real `process.env` value at runtime. That's invisible on a statically-prerendered page (the
literal is baked into the HTML at build time) but silently falls back to nothing on any
dynamically-rendered route — which is exactly what `/roadmap` and `/admin` are. Caught by
actually curling those routes, not by the build passing. **A green build does not prove a
dynamic route works — request it.**

### Release flow

1. `git checkout -b feature/short-desc develop`
2. Work on the feature branch. Commit often.
3. PR `feature/* → develop`. Merge after CI is green.
4. Bump `VERSION` on `develop`, then PR `develop → staging`.
5. Validate on staging (`0.2.0-rc`). Fixes go `bugfix/* → develop → staging`.
6. PR `staging → main`. Tag it: `git tag v0.2.0 && git push origin v0.2.0`.

### Rules

- Never commit directly to `main`, `staging`, or `develop`.
- All merges via PR. No force-pushes.
- Git tags (`v0.x.x`) live on `main` only and match `VERSION` exactly.
- Branch naming: `feature/short-desc`, `bugfix/issue-123`, `refactor/xyz`.
- Commit messages: imperative, conventional (`feat: add battery sizing calculator`).
- Never commit `node_modules/`, `.env*`, or `.next/`.
- Never mention Claude as co-author.
- `zonzelf` is a **public** repo — no secrets, no customer data, no API keys, ever.

---

## Rules Derived From Session Corrections

*Adapted from the BOND platform's 15 rules, distilled across 19 sessions. These exist because
the same mistakes kept recurring. They are non-negotiable.*

### 1. Session start protocol

Before touching code: read this file, check the roadmap for the current phase, and run
`git branch` and `git log --oneline -5`. State the current phase and the last completed task.
Never assume context carried over from a previous session — reconstruct it from files and git.

### 2. Confirm the branch before every task

Run `git branch` first. If you are on `main`, `staging`, or `develop`, create a `feature/*` or
`bugfix/*` branch from `develop` before making any change. Enforce this proactively, not after
the fact.

### 3. Every new view uses design tokens

No new component ships with hard-coded hex or raw Tailwind color scales. If an existing view
you touch lacks tokens, convert it as part of the task without being asked. A view that reads
as "not ZonZelf" is a bug.

### 4. Visual verification for UI changes

Never declare a UI change done from code reading alone. Run the app (`run` skill) and take a
screenshot into `../screenshots/`. If you cannot visually verify in the current context, say
explicitly: **"I cannot visually verify this — please confirm it looks correct"** before
closing the task. A passing type-check does not prove the page renders.

### 5. Regression prevention — verify before declaring done

Before committing: `npm run build` and `npm run lint` must pass, and every page you touched
must load without a console error. If a previously working feature breaks mid-session, stop
all new work and restore it first. Never move on while a regression is live.

### 6. Two strikes, then look at runtime evidence

Never make more than two consecutive attempts at a bug fix by reading code. After two
failures, switch to real evidence: browser console, network tab, `next dev` server output,
Vercel function logs, or the Supabase logs. Fix the cause the log actually shows. Don't ask
the user to re-describe the bug when the log is right there.

### 7. Never swallow errors

BOND's deploys reported success for weeks while applying nothing, because the migration loop
ended in `2>/dev/null || true`. **A silent failure is worse than a loud one.** No empty
`catch {}`. No `.catch(() => null)` that discards the error. Every API route returns a real
status and logs the actual error server-side. This matters most in `/api/ingest`: a monitoring
agent posting into a void is the worst possible failure mode for this product.

### 8. Measure once, commit once

No iterative `420px → 425px → 435px → 420px` nudging. Open DevTools, read the computed value,
set it with a deliberate buffer, commit once. If it still clips, find out *why* — flex
overflow, scrollbar, padding — rather than nudging the number again.

### 9. Supabase: RLS is the access control, not the UI

Every table gets Row Level Security enabled and an explicit policy, written in the same PR
that creates the table. Hiding a button or a nav link is not authorization. Server-side route
handlers and server components re-check the user's role — never trust a client-supplied
`user_id`. The anon key is public by design; the service-role key never leaves a server
context and never enters this public repo.

### 10. Migrations are versioned files, applied everywhere

Schema changes are committed SQL migration files, never clicks in the Supabase dashboard.
Migrations must be idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) and
must be applied to **both** the staging and production projects. Before declaring a data fix
done, verify the row exists in the database the running app actually reads.

### 10b. The roadmap board is mutable state — dump it before you touch it

`/admin/roadmap`'s Server Actions write straight to the database, so any item created or
re-statused through the UI exists **only** there. `supabase/seed.sql` is a hand-maintained
reconstruction, **not a backup** — on 2026-08-22 it was found to have silently drifted from
the live board in four places, including an operator-created item that existed nowhere in
git. A `db reset` cannot catch this: it only ever proves `seed.sql` agrees with the
migrations, never that either agrees with reality.

```bash
npm run dump:roadmap      # scripts/dump-roadmap.ts — seed.sql-shaped, service-role read
```

Run it **before and after** any roadmap change and diff, then fold drift back into
`seed.sql` in the same PR. And never run `supabase db reset --linked` — the hosted project
is shared between staging and dev, and it would destroy every admin-UI edit with no backup.

### 11. Column drops are the highest-risk change

BOND dropped a column that code still queried and crashed a core flow in *every* environment.
Before removing or renaming any column, grep the whole tree for its name. Prefer deprecating
in one release and dropping in the next.

### 12. Guard optional fields on every insert

Form fields and optional columns arrive as `null` or `""` and violate `NOT NULL` constraints.
Before every insert/update, drop empty optional keys so the database default applies, or set
them explicitly. Validate at the boundary — parse the request body, don't spread it into a
query.

### 13. Never end a session with dangling commits

After a PR merges, commits pushed to that branch do **not** reach `develop`. At session end:

```bash
git log origin/develop..origin/feature/your-branch --oneline
```

If anything appears, open a follow-up PR before signing off.

### 14. Public repo hygiene

Before every commit, confirm no key, token, Supabase service-role secret, `.env` value, or
personal detail from the neighbor's build is in the diff. `zonzelf` is public and git history
is forever.

### 15. Be critical, never sycophantic

Point out violations of these rules, including in the user's own requests. Plan before coding:
list files affected and what will be verified. Keep changes minimal and focused. If a request
fails the Blue Ocean feature-creep test, say so before building it.

---

## Development Commands

```bash
npm run dev      # next dev — http://localhost:3000
npm run build    # next build — must pass before any commit
npm run lint     # eslint
npm start        # production server
```

### Known baseline as of 2026-08-20 — don't mistake these for your own breakage

- **`npm run build` fails on stale generated types.** A stale `.next/types/validator.ts`
  produces `TS2344: Type 'Route' does not satisfy the constraint 'never'`, pointing at
  `layout.tsx` and the generated validator. It is not a real type error and `LayoutProps<"/">`
  is not wrong. Fix: `rm -rf .next && npm run build`. Check this **before** touching
  `layout.tsx`.
- **`rm -rf .next` while `next dev` is running drops its build output.** The dev server does
  not always recover on its own — check `curl -sf http://localhost:3000` after clearing
  `.next` and restart the dev server if it doesn't respond. Prefer stopping the dev server
  before clearing `.next`.
- **`npm run lint` is clean as of the `feature/claude-md-and-version` PR** — the 13
  `react/no-unescaped-entities` errors that used to live in
  `src/app/guides/batteries/page.tsx` are fixed. Two pre-existing warnings remain in
  `src/app/calculators/load/page.tsx` (`no-unused-vars` on `CardDescription`, `PRESETS`) —
  harmless, clean up when next touching that file. "Lint passes" now means **zero errors**;
  CI (`.github/workflows/ci.yml`) enforces this on every PR.

There is **no test suite yet**. Until there is, "verified" means: the build passes, lint is
clean, and the affected pages were opened and screenshotted. Do not claim more.

---

## When in doubt

Read this file, `AGENTS.md`, `../PROJECT.md`, and the existing code. Plan. Ask before writing
if the request is ambiguous — and check it against the Blue Ocean Contract first.
