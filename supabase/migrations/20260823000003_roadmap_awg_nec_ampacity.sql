-- The AWG calculator now sizes conductors from NEC Table 310.16 instead of
-- chassis-wiring ratings. Highest-severity correctness bug from the 2026-08-21
-- audit: AWG 10 was presented as a 55A conductor when the code allows 30A.
--
-- Keep in sync with supabase/seed.sql (CI enforces this — see
-- npm run check:roadmap-migrations).

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed: the table now carries NEC 310.16 copper ampacities with a selectable 60/75/90 °C terminal column (defaulting to 75 °C per NEC 110.14(C), since the lowest-rated termination limits the circuit), and applies the NEC 240.4(D) small-conductor caps that override it — so 10 AWG reads 30 A, not the 55 A chassis rating it showed before. Sizes thinner than 14 AWG are gone; Table 310.16 does not cover them. Values cross-checked against two independent reproductions of the table and covered by unit tests in src/lib/__tests__/awg.test.ts. The page cites its sources and states what is NOT modelled: free-air ampacity (310.17, only one source could be verified), ambient derates above 30 °C, and conduit-fill adjustment — all of which REDUCE ampacity. Still blocked on the separate licensed-electrician sign-off before this counts as reviewed, and overcurrent protection is called out on the page but not yet calculated (see the fuse/breaker item).'
  where title = 'Calculators: AWG ampacity from a cited electrical code';

-- Unit tests now exist, so this is no longer a zero-coverage repo. The item
-- stays open: only the AWG module is covered.
update public.roadmap_items
  set status = 'in_development',
      dev_percent_complete = 25,
      description = 'Started: src/lib/__tests__/awg.test.ts covers the NEC 310.16 table, the 240.4(D) caps, round-trip voltage-drop maths, the passing-set contract, and the zero-voltage NaN guard — 11 tests via node:test through tsx, no new dependencies (npm test). Still uncovered: the load, battery and panel calculators, the load→battery→panel efficiency contract, the AWG table beyond spot-checks, and reviewBatteryModel() flags. For tools that recommend wire gauge and cutoff voltages, build + lint + screenshot was never a test strategy; this is the first of it, not the whole of it. Wire npm test into CI when a second module is covered.'
  where title = 'Unit tests for calculator math and battery-review';
