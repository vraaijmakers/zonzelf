-- The EG4 6000XP is admitted, and the reading corrected a number the row had
-- previously been refused over -- in the dangerous direction.
--
-- An earlier attempt sourced "25 A per tracker" from a search index of EG4's
-- spec sheet. The sheet itself (VER 1.4.4) gives two figures:
--
--     MAX. USABLE INPUT CURRENT          17/17 A
--     MAX. SHORT CIRCUIT INPUT CURRENT   25/25 A
--
-- 25 A is what the tracker survives; 17 A is what it converts. Recording 25 A
-- as the usable figure would have permitted about half again as many strings
-- in parallel as the unit can harvest, with no error shown -- only a quieter
-- array. The gate caught this by refusing the row until the PDF itself could
-- be read, which is exactly what it is for.
--
-- It also exposed a modelling gap: current has two limits for the same reason
-- voltage does, and pv-string.ts only had one.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set dev_percent_complete = 40,
      description = 'Started 2026-08-30. src/lib/inverter-sizing.ts carries INVERTER_PRESETS behind an admission gate: every figure from the manufacturer''s own datasheet, opened and read, with a reachable sourceUrl, the two PV ceilings kept distinct, and inverter-review.ts passing. Three rows admitted: the Sun Gold Power SPH8048P and SPH10048P from the manufacturer''s SPH8-10KW User Manual V1.3 pages 58-59, and the EG4 6000XP from EG4''s own spec sheet VER 1.4.4. The EG4 row is the argument for the gate. It was refused on first attempt because its window and per-tracker current came from a search index rather than the sheet; when the sheet itself became readable (pypdf in a venv -- Homebrew cannot install poppler on this macOS 12 box, which is past its support window and has no git repository to update from), the search figure turned out to be WRONG: 25 A is the MAX. SHORT CIRCUIT INPUT CURRENT, while MAX. USABLE INPUT CURRENT is 17 A. Recording 25 A as usable would have permitted about half again as many parallel strings as the tracker can convert, silently -- no error, just a quieter array. That correction exposed a modelling gap and closed it: pv-string.ts now treats current as a PAIR, exactly like voltage. The short-circuit rating is the damage limit (protection, refuses the arrangement) and the usable rating is the harvest limit (capacity, reports clipping); a datasheet giving only one figure has it treated as the damage limit, the same conservative rule the voltage side uses. inverter-review.ts gained the matching invariant, and the guide gained a section on the pair. src/lib/inverter-review.ts is the physics-shaped sanity check mirroring battery-review.ts: the tracking window must sit inside the absolute maximum, the window must not be inverted, the short-circuit rating must not be below the usable current, surge must not be below continuous, and a per-tracker current above 60 A is flagged as probably a total. PANEL_PRESETS is still empty and needs the same treatment. Remaining: Supabase panel_models and inverter_models tables with RLS, scrapers under scripts/, and /admin review queues mirroring /admin/batteries, so the library grows without a code change. Typing a datasheet in by hand stays a first-class path -- no catalogue will ever have every model.'
  where title = 'Component spec library: inverters and panels';
