-- Discovered while verifying the scraper end-to-end: this project has no
-- table-level grants for service_role at all (confirmed against
-- roadmap_items too, not just this new table) — consistent with
-- CLAUDE.md's note that the service-role key has never actually been used
-- by anything in this app before now. service_role bypasses RLS once it
-- clears the GRANT layer, so this is the only privilege battery_models
-- needs for scripts/scrape-eg4.ts to write through it.

grant usage on schema public to service_role;
grant select, insert, update, delete on public.battery_models to service_role;
