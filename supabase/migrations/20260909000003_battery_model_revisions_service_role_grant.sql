-- Same trap as 20260821000001_battery_models_service_role_grant.sql, walked
-- into again by 20260909000001: this project has no default table-level grants
-- for service_role, so a new table is invisible to the service-role key until
-- it is granted by name. That migration granted battery_models and nothing
-- else, which is why the scrapers have written batteries happily for weeks and
-- then hit "permission denied for table battery_model_revisions" the first
-- time one tried to file a proposal.
--
-- Caught by running the gate end-to-end against the real database rather than
-- by the build, the tests or the migration applying cleanly — every one of
-- those passed. The failure mode was the bad kind, too: the scraper logged the
-- denial and carried on, so a re-scrape of a published row would have
-- correctly refused to overwrite it and then silently failed to record what it
-- wanted to change.
--
-- service_role bypasses RLS once it clears the GRANT layer, so this is the
-- only privilege the scrapers need. anon still gets nothing: an unreviewed
-- proposal has no public form.

grant usage on schema public to service_role;
grant select, insert, update, delete on public.battery_model_revisions to service_role;
