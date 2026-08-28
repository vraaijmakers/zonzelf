-- Capacity / protection split, and the derivation chrome that makes it real.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed. src/lib/calc-register.ts classifies every calculator output as CAPACITY or PROTECTION, including two that are not shipped yet so they cannot arrive as a surprise register. Capacity (daily kWh, bank kWh, panel count) stays a confident band, labelled Sizing. Protection (conductor gauge, OCPD, cutoff voltage) renders through ProtectionOutput, which cannot take a single verdict as its headline — it takes the set of options that pass, the arithmetic, and the cited source. String Voc vs MPPT is classified as protection and is the separate phase-1 item. Inverter VA is classified as capacity and is the motor-surge item. A test rejects any protection view whose title contains "recommended." Still blocked on the licensed-electrician sign-off.'
  where title = 'Calculators: split output into capacity and protection registers';

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed for the shipped protection outputs. Permanent design principle, not a temporary measure pending sign-off: Winter v. G.P. Putnam''s Sons held a book''s informational content is not a product; Saloomey v. Jeppesen held aeronautical charts ARE, because a chart mechanically converts data into an output acted on in a hazardous activity. "Recommended gauge: AWG 10" in large green type is the chart. SCOPE: the protection register. The AWG page already returned a passing set rather than a verdict; it now uses the shared ProtectionOutput chrome, as does OCPD and the battery cutoff, which is no longer a sidebar voltage. Lithium cutoff options are "Use the BMS or percent remaining" — a voltage is not in the options list, only in the derivation, labelled as already-near-empty. Lead-acid options are a resting band with the sag-under-load warning in the derivation. The code table stays on the AWG page. Installation context (terminal temperature, circuit type, voltage-drop budget) is still the user''s to pick. Still blocked on the electrician sign-off. String Voc vs MPPT is the next protection output to add, not a hole in this item. Pairs with the disclaimer, replaces neither.'
  where title = 'Calculators: show the derivation, never a bare recommendation';

update public.roadmap_items
  set dev_percent_complete = 90,
      description = 'npm test runs in CI on every PR. 115 tests across nine modules. Added: the capacity/protection catalog (every output classified, including two unshipped), protection views that return a set and a source rather than a verdict, lithium cutoff options containing no voltage, and a contract that rejects a "recommended" headline. Still uncovered: reviewBatteryModel() flags, and anything at the page level — there is no component or end-to-end testing at all.'
  where title = 'Unit tests for calculator math and battery-review';
