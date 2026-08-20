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

### Monetization — the intended path

Affiliate links from day 1; **freemium monitoring** (~$5–9/mo) as the primary recurring
revenue, because monitoring creates daily active users and daily active users are what turn a
content site into a business. Component database, electrician lead-gen, digital products, and
sponsored brand guides come later. Revenue work that isn't the monitoring subscription is a
Phase 2+ distraction.

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
- CI: GitHub Actions (`ci.yml` — lint + build on every push/PR; no deploy step yet).

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
├── next.config.ts          # injects VERSION as NEXT_PUBLIC_APP_VERSION at build time
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

**Planned, not yet built** (see the roadmap module before starting any of it):
`/dashboard` (user projects), `/monitoring` (live inverter data), `/admin` (operator portal),
`/api/ingest` (agent telemetry), `/api/scrape` (content aggregation).

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

`next.config.ts` reads `VERSION` at build time and injects it as `NEXT_PUBLIC_APP_VERSION`, so
it works in both server and client components. `src/lib/version.ts` exposes it: `clean()`
returns `0.2.0` for the public footer, `full()` appends the environment suffix (`-dev`, `-rc`)
for admin screens, and `appEnv()` gives the resolved environment. Environment comes from
`NEXT_PUBLIC_APP_ENV`, falling back to Vercel's `NEXT_PUBLIC_VERCEL_ENV` (`preview` → staging).
**Never let an env suffix reach a public page** — the footer uses `clean()`.

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
