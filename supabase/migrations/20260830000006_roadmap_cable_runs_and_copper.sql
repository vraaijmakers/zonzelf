-- The cable step stops being context-free, and says what metal it assumes.
--
-- Reported: "the current UI is confusing to me, what cables are we sizing?"
-- Fair. Every other step in the chain hands numbers forward; this one asked
-- for a naked "Current (amps)" with no indication of which of a system's four
-- very different runs it belonged to. Someone who has just been through four
-- steps arrives at a blank field and sizes the whole system on whichever
-- figure they happened to remember.
--
-- Also reported: nothing on the site said the ampacity figures are copper.
-- They always were -- NEC 310.16's copper column -- and it was documented only
-- in a code comment. Somebody sizing a run and then buying cheap CCA gets
-- numbers that are wrong for the wire in their hand, in the undersizing
-- direction.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (1, 'calculators', 'Cable step: name the run, and say the metal',
   'Shipped 2026-08-30 from direct user feedback. src/lib/circuit-runs.ts names the four cable runs a system actually has -- one panel string to the combiner, combiner to inverter, battery to inverter, inverter to AC panel -- each with where it physically goes, a typical length, a conventional voltage-drop budget and the thing that catches people out on it. The chain already knew most of these currents, so the page now offers them: PV runs from the array step''s panel Isc, the battery run derived from inverter continuous watts over bank voltage including inverter losses, the AC run from continuous watts at 240V with the 120V comparison spelled out. Currents are handed over RAW, never pre-multiplied -- the cable step applies its own 125% or 156%, and passing it the array summary''s already-factored designIscA would apply the code factor twice. ArraySummary gained panelIscA and stringsPerTracker to make that possible. The battery run carries the tightest drop budget and the shortest suggested length on purpose: it is the highest current in the system by a wide margin and the run people most often undersize, and a long thin battery cable is why an inverter cuts out on motor start with a full bank. Combiner guidance falls out of the array step rather than being a new question -- one string per tracker means nothing to combine, three or more means NEC 690.9(A) string fusing, and an unstated module fuse rating is reported as unknown rather than assumed either way. CONDUCTOR MATERIAL: src/lib/conductor-material.ts and a new section in the wiring guide. The user asked about the temperature coefficient difference between the metals, and the honest answer is that the property usually named is NOT the one that matters -- copper and aluminium differ by about 3% in temperature coefficient of RESISTANCE (0.00393 against 0.00403 per degC). The decisive property is thermal EXPANSION: 16.6 against 23.1 micrometres per metre per kelvin, about 40% more for aluminium, which at a terminal means it is squeezed as it warms, cold-flows, and comes back looser as it cools -- every load cycle, self-reinforcing, ending at a charred connection. That is the 1960s-70s aluminium branch-circuit fire mechanism and the reason aluminium needs CO/ALR or AL-CU listed terminals. Copper-clad aluminium is called out specifically: the cut end looks like copper so it cannot be identified by eye, and it is generally not listed for NEC wiring at all, making it impermissible rather than merely worse. Four identification tests are given, led by weight, because copper is 3.3x denser and that is the check anyone can do. Deliberately NOT done: an aluminium ampacity column. NEC 310.16 has one and aluminium is used legitimately in feeders, but publishing it would imply this site has something to say about aluminium terminations, listings and torque specs, and it does not.',
   'in_test', 90, true, 92);
