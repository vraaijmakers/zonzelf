-- Appliance presets now use duty cycle rather than nameplate × hours. The
-- fridge rows were roughly double reality, and because the sizing chain
-- compounds, that one row inflated the bank, the array, and the conductor
-- sized for them.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed for refrigeration: appliance rows now carry a duty cycle — the fraction of their in-service hours they actually draw power — and the presets apply it. The full-size fridge falls from 150 W × 24 h = 3.6 kWh/day to about 1.3 kWh/day, and the mini fridge from 1.92 to about 0.58, both inside the 1–2 kWh/day band two independent sources give for a modern unit in a temperate kitchen (compressor running 33–40% of the time). A chest freezer preset was added on the same basis. Watts stays the RUNNING figure so inverter sizing can still use it; duty % is what turns it into energy. Air-conditioning presets are deliberately left at 100% and flagged as cycling: no two-source duty figure was established for them, and inventing one would repeat this bug — the overestimate oversizes rather than undersizes. Rows saved before this shipped have no duty value and are treated as 100%, so no one''s stored numbers change underneath them. Covered by src/lib/__tests__/appliance-load.test.ts.'
  where title = 'Calculators: appliance presets use duty cycle, not nameplate × 24h';

update public.roadmap_items
  set dev_percent_complete = 40,
      description = 'Started: src/lib/__tests__/ covers the NEC 310.16 ampacity table, the 240.4(D) caps, round-trip voltage-drop maths, the AWG passing-set contract, the zero-voltage NaN guard, and now the appliance duty-cycle model and preset bands — 21 tests via node:test through tsx, no new dependencies (npm test). Still uncovered: the battery and panel calculators, the load→battery→panel efficiency contract, and reviewBatteryModel() flags. Wire npm test into CI once the efficiency contract is covered, so the three pages cannot drift apart silently.'
  where title = 'Unit tests for calculator math and battery-review';
