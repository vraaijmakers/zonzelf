-- Fixes the highest-severity bug from the 2026-08-21 production audit: the
-- battery calculator's inverter-cutoff card invented "typical" voltages
-- (12.0V for 12V LiFePO4 at 80% DoD) that contradicted the already-correct
-- numbers in /guides/depth-of-discharge (12.8-13.0V) and implied a single
-- voltage can enforce a DoD limit on lithium at all, which the guide already
-- explains it can't. The calculator now imports the same bands from
-- src/lib/battery-chemistry.ts and branches copy by chemistry instead of
-- printing one number for every pack.
--
-- Not the full "licensed electrician/engineer sign-off" gate (still
-- 'planned', still blocks production) — this only makes the calculator stop
-- contradicting the guide it already had.
--
-- Keep in sync with supabase/seed.sql, same pattern as the other
-- incremental-patch migrations in this directory.

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed: the battery calculator invented its own LVD numbers (12.0V for 12V LiFePO4 at 80% DoD — actually near-empty) instead of using the ones already correct in /guides/depth-of-discharge. Calculator now shares src/lib/battery-chemistry.ts with that guide and gives chemistry-specific copy (lithium: use the BMS, voltage is not a reliable proxy; lead-acid: resting-voltage band, explicit sag-under-load warning) instead of one invented number. Still blocked on the separate "licensed electrician/engineer sign-off" item before this counts as reviewed.'
  where title = 'Calculators: correct inverter cutoff voltages';
