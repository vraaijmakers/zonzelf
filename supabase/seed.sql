-- Seed data for local development (`supabase db reset` applies this
-- automatically). Reflects the actual roadmap as of 2026-08-20 so the board
-- isn't empty on first load. Safe to re-run — it's insert-only against a
-- table that starts empty in a fresh reset.

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (0, 'infrastructure', 'CLAUDE.md operating contract',
   'Blue Ocean Contract as a scope gate, locked design tokens, branch/version workflow, session-correction rules.',
   'in_production', 100, true, 10),

  (0, 'infrastructure', 'Branch workflow + CI',
   'develop/staging/main branch protection, GitHub Actions build+lint gate on every PR.',
   'in_production', 100, true, 20),

  (0, 'admin', 'Roadmap board + admin portal foundation',
   'Supabase auth, profiles/role table, gated /admin shell, this roadmap board (public read, admin write).',
   'in_development', 60, true, 30),

  (0, 'infrastructure', 'Design token pass',
   'Wire --zon-* tokens into globals.css and shadcn primitives; fix the circular --font-sans bug.',
   'planned', 0, true, 40),

  (0, 'infrastructure', 'Staging environment',
   'Second Supabase project + Vercel preview environment for the staging branch.',
   'in_development', 30, true, 50),

  (1, 'monitoring', 'Local monitoring agent',
   'Brand-agnostic MODBUS/serial agent (Python, runs on a Pi/PC) posting to /api/ingest. Differentiator #2.',
   'planned', 0, true, 60),

  (1, 'onboarding', 'Guided beginner onboarding',
   'Plain-English explainers woven into guides and calculators, not a separate wizard. Differentiator #1.',
   'planned', 0, true, 70),

  (2, 'community', 'Community data aggregation',
   'Opt-in anonymized aggregate stats ("systems like yours averaged X peak sun hours"). Differentiator #3.',
   'planned', 0, true, 80);
