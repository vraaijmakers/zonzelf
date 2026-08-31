-- Found in real use, 2026-08-30, and worth recording as a finding rather than
-- a tweak: someone with the Sun Gold SPH10048P manual open filled in four of
-- nine inverter spec fields and left five blank. The datasheet stated every
-- one of them. Only the names differed --
--
--   we ask "Surge / peak output"        they print "Max. Peak Power"
--   we ask "Max PV input power"         they print "Max. Input Power"
--   we ask "Max PV current per tracker" they print "Max. Input Current 22/22 A"
--   we ask "Max battery charge current" they print "Max. PV Charge Current"
--   we ask "MPPT window, top"           they print it as the second half of
--                                       "MPPT Operating Voltage Range 125-425"
--
-- The last one was our fault structurally, not just lexically: one row on the
-- datasheet, two boxes on the form. A tool only usable by someone who already
-- knows the answer is differentiator #1 inverted.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (1, 'calculators', 'Component spec library: inverters and panels',
   'Started 2026-08-30. src/lib/inverter-sizing.ts carries INVERTER_PRESETS behind an admission gate: every figure from the manufacturer''s own datasheet, opened and read, with a reachable sourceUrl, the two PV ceilings kept distinct, and inverter-review.ts passing. First two rows admitted are the Sun Gold Power SPH8048P and SPH10048P, from the manufacturer''s SPH8-10KW User Manual V1.3 pages 58-59. The EG4 6000XP was worked up and REFUSED: its 120-385 VDC window and 25A per tracker came from a search index of the spec sheet rather than the sheet itself, and those are exactly the fields the gate protects — no PDF text extractor exists on the build machine. src/lib/inverter-review.ts is the physics-shaped sanity check, mirroring battery-review.ts: the tracking window must sit inside the absolute maximum, the window must not be inverted, surge must not be below continuous, and a per-tracker current above 60A is flagged as probably a total. PANEL_PRESETS is still empty and needs the same treatment. Remaining: Supabase panel_models and inverter_models tables with RLS, scrapers under scripts/, and /admin review queues mirroring /admin/batteries, so the library grows without a code change. Typing a datasheet in by hand stays a first-class path — no catalogue will ever have every model.',
   'in_development', 25, true, 99);

update public.roadmap_items
  set description = 'Plain-English explainers woven into guides and calculators, not a separate wizard. Differentiator #1. Started 2026-08-25 after an audit of where each concept actually appears found the calculators had outrun the teaching badly: duty cycle, load profiles, the three-stage efficiency chain, the battery scenario band, dark hours and the cooling/heating asymmetry were all enforced by tools and explained on no page at all, and the glossary — whose entire job this is — defined none of the new vocabulary. A beginner met "Duty %", "Runs: Cooling" and "156% of Isc" with nowhere to look them up, which is differentiator #1 inverted. Done: the glossary gained ampacity, autonomy, continuous load, design current, duty cycle, Isc, OCPD and round-trip efficiency, cross-linked to the calculators and guides that use them; the wiring guide gained the 125% continuous rule and the 156% PV rule. 2026-08-30, alongside the array wiring step: /guides/strings-and-mppt was written as the lecture behind it — the four label figures and why a panel has no single voltage, series versus parallel, the three-number MPPT window, both temperature formulas with worked examples in each direction, why "just use 220V" is a rule of thumb and what it stands in for, the string-fusing inequality, and an end-to-end worked design. Its numbers are locked to src/lib/pv-string.ts by test, so the guide cannot drift from the tool it teaches. The glossary gained Voc, Vmp, Imp, temperature coefficient, STC, string, MPPT window, string fuse and max series fuse rating. THEN THE SAME DAY, found in real use and fixed: someone with a Sun Gold SPH10048P manual open filled in four of nine inverter spec fields and left five blank, because the datasheet states every one of them under a different name. src/lib/datasheet-vocabulary.ts is now the single source for what each number is called on a real datasheet — rendered under every field on both spec forms and as a translation table in the guide, so the two cannot drift — and a test reads the page sources to prove no field exists without an entry. Two structural fixes went with it: the MPPT range is presented as the single labelled from/to range the datasheet prints rather than two unrelated boxes, and the "22/22 A" per-tracker notation is called out explicitly because it reads as a fraction. Remaining: the efficiency chain belongs in /guides/how-it-works, and the autonomy-vs-overnight distinction plus the cooling/heating asymmetry belong with battery sizing. No test can tell you an explanation is clear, so this one is verified by a person reading it.'
  where title = 'Guided beginner onboarding';
