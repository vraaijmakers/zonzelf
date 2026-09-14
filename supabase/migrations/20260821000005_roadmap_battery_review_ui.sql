-- Shipped the battery-model review UI (/admin/batteries) this session, which
-- was the "scrapers" slice of the bundled "Admin portal: scrapers, SEO,
-- memberships, payments" item. Splits that item so the shipped slice reads
-- as shipped, and the still-unbuilt SEO/memberships/payments sections stay
-- their own line rather than looking finished by association.
--
-- Incremental patch for an already-seeded environment — see the header
-- comment on 20260820000003_roadmap_priorities_update.sql for why this
-- exists alongside the same change in supabase/seed.sql.

update public.roadmap_items
  set title = 'Admin portal: SEO, memberships, payments',
      description = 'The remaining /admin sidebar sections beyond the roadmap board and battery review — currently "Soon" stubs in src/app/admin/layout.tsx.'
  where title = 'Admin portal: scrapers, SEO, memberships, payments';

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (2, 'admin', 'Admin: battery model review (approve/reject scraped rows)',
   'src/app/admin/batteries — lists battery_models rows pending review with automated sanity checks (capacity_kwh vs voltage x Ah, price/kWh and DoD range checks for the stated chemistry, multi-unit bundle detection from the model name, source-domain plausibility, near-duplicate grouping) shown as pass/warn/fail per row, plus approve/reject/unpublish actions. The checks catch scraper mistakes, not physics correctness — a human still opens source_url and spot-checks before approving. Same logic is meant to seed "Battery scraper: agent-assisted review" later.',
   'in_test', 90, false, 75);
