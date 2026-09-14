-- Closes the gap 20260821000001_battery_models_service_role_grant.sql spotted
-- but did not fix: its own header notes the missing service_role grants were
-- "confirmed against roadmap_items too", yet only battery_models got one.
-- scripts/dump-roadmap.ts hits "permission denied for table roadmap_items"
-- without this.
--
-- SELECT only, deliberately. The dump script is a backup/export path and must
-- never be able to write the board; the admin UI writes as `authenticated`
-- under RLS (see 20260820000002_roadmap_items.sql), which is unchanged here.
-- service_role bypasses RLS once it clears this GRANT layer, so read access is
-- exactly and only what the export needs.

grant usage on schema public to service_role;
grant select on public.roadmap_items to service_role;
