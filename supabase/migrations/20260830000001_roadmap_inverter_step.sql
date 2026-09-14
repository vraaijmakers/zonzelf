-- The sizing chain becomes inverter-first.
--
-- The panel calculator emitted a panel count and could say nothing about how
-- to wire it, because how to wire it is decided entirely by the tracker the
-- array connects to: series count by the maximum PV input voltage, parallel
-- count by the maximum input current, total array watts by the maximum PV
-- power. Sizing an array before choosing the unit means designing against
-- limits nobody has read yet, which is how a beginner puts 600V into a 500V
-- input and destroys an inverter before the system ever runs.
--
-- So the inverter moved from step 4 to step 3, ahead of panels, and the old
-- "Charge controller" step 5 became "Array wiring" — on an all-in-one hybrid
-- the tracker is not a separate product, and asking for it twice taught the
-- wrong model.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Shipped as step 3 of the chain, ahead of panels rather than after them — the reorder is the substance of this item, not packaging. /calculators/inverter sizes continuous and surge demand from the appliance rows, and collects the unit''s own specifications for the array steps that follow. Surge is now a number instead of a sidebar paragraph: appliance rows carry a start-up multiple (src/lib/appliance-load.ts), the motor presets are tagged with the standard bands (3x for an induction motor starting under load, 2x for smaller motors, 1.5x for an inverter-driven compressor with a soft start — a mini-split tagged 3x would oversize an inverter by thousands of watts for a spike that never happens), and rows saved before surge existed count as 1x with the correction offered inline, following suggestedDuty and suggestedProfile rather than moving anyone''s stored numbers. The sizing rule is continuous demand plus the LARGEST SINGLE start-up, not the sum of every surge: motors do not start in the same half-second, and adding them together sizes for a coincidence. Continuous demand still assumes everything runs at once, which overestimates — stated on the page rather than corrected by an invented diversity factor, because that is how the fridge duty-cycle bug happened. src/lib/system-voltage.ts no longer has to use bank size as a proxy for continuous power: it derives the recommendation from DC current against a 125A ceiling, which is what the kWh bands were always standing in for, and keeps the proxy only for the battery step that runs before this one. The unit''s solar-input fields start EMPTY on purpose — a default MPPT window is a number nobody chose silently deciding a protection output two steps later. INVERTER_PRESETS is deliberately empty: the EG4 6000XP was worked up as the first candidate and refused admission, because the two fields that matter most (the 120-385VDC window and the 25A per tracker) came from a search index of the spec sheet rather than the datasheet itself, and the gate says opened and read. Covered by src/lib/__tests__/inverter-sizing.test.ts. Still blocked on the licensed-electrician sign-off.'
  where title = 'Calculators: inverter / motor-surge sizing step';

update public.roadmap_items
  set description = 'The panel calculator says how many panels to buy and nothing about how to wire them, so a beginner can series the whole array and exceed the charge controller''s maximum input voltage — a common and expensive way to destroy an MPPT before the system ever runs. Add a string check: panel Voc, count in series, and the cold-temperature Voc correction that catches people out (Voc RISES as temperature falls, so a string sized in July can be over the limit in January), checked against the controller''s max input. Protection-register output: show the derivation, cite the panel datasheet and controller spec, never a bare verdict. UNBLOCKED 2026-08-30: the inverter step now ships and publishes the tracker specifications this needs — max PV input voltage, the MPPT window as a separate pair of numbers from it, max PV power and max current per tracker — so this item no longer has to invent them. It is now step 5, "Array wiring", and covers the parallel half as well: NEC 690.9(A) string fusing, which is why one or two strings need no fuses and three or more do. Two temperatures are needed, not one — the record low sets the cold Voc against the damage ceiling, and a hot cell temperature sets the sagging Vmp against the bottom of the MPPT window. The second is the mechanism behind the common "design to 220V, not the 100V minimum" advice, and modelling it beats repeating the number.'
  where title = 'Calculators: string voltage vs MPPT input window';
