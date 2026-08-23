-- 2026-08-23. Follows the legal-posture work in 20260822000002. That migration
-- established that prescriptive calculator output is what moves ZonZelf from
-- the publisher side of the Winter line to the product side. This one applies
-- that finding to the thing the product actually is: the sizing chain
-- (appliances -> daily kWh -> battery bank -> panel array -> conductors), whose
-- output is effectively a shopping list.
--
-- The key finding is that RISK IS NOT UNIFORM ACROSS THE CHAIN:
--
--   Benign    - daily kWh, bank capacity, panel count, inverter continuous
--               rating. Wrong here means an undersized system and a
--               disappointing December, not an injury.
--   Dangerous - conductor gauge, overcurrent protection, battery cutoff
--               voltage, string Voc vs MPPT input window. Wrong here starts
--               fires or destroys equipment.
--
-- So the whole "what equipment do I need" product stays confident and specific.
-- Only a narrow protection register needs the derivation treatment. This also
-- happens to be where the money is: the affiliate value is the $1,200 battery,
-- the $900 inverter, the $150 panels -- all benign-register outputs. Cable is
-- ~$80. The commercial and the safe answer are the same answer.
--
-- PHASING TEST, applied consistently below: an item is phase 0 if the product
-- as shipped ACTIVELY MISLEADS, and phase 1 if it is merely INCOMPLETE. The
-- phase-0 correctness items are deliberately NOT folded into the phase-1
-- system designer -- a required fix parked behind a feature stops being a gate.
--
-- Keep in sync with supabase/seed.sql. Verify with `npm run dump:roadmap`
-- before and after applying (see CLAUDE.md rule 10b).

-- ---------------------------------------------------------------------------
-- Existing phase-0 items become the chain's foundation, but stay gates
-- ---------------------------------------------------------------------------

update public.roadmap_items
  set description = 'Production gate, and the data contract the whole sizing chain rests on. Three different stories today: the load calculator publishes adjustedKwh = raw / efficiency and tells the user to carry it into both battery AND panel sizing; the battery calculator uses adjustedKwh (good) but then ignores the per-chemistry battery.efficiency field it already defines; the panel calculator uses rawKwh and applies its own efficiency (correct in isolation, to avoid double-counting). Because the stages feed each other, a disagreement here does not stay local -- it multiplies down the chain, and combined with the 2-3x fridge preset a beginner can end up with a bank and an array that are both roughly twice the size they need. Pick one model, make the copy match the math, and add a test so the three pages cannot drift again. This defines the shared model the phase-1 system designer is built on, so it lands first and independently.'
  where title = 'Calculators: one efficiency model across load / battery / panels';

update public.roadmap_items
  set description = 'Production gate, and the first cross-stage check in the sizing chain. The battery and panel calculators size storage (kWh) and generation (kWh/day) independently and never check whether the array can refill the bank within the site''s peak sun hours -- so a user can size a "correct" bank and a "correct" array and still under-charge every day. Add a check comparing array output over peak sun hours against the daily kWh drawn from the battery, and warn when the recharge does not close the loop. This is the pattern every later cross-stage check follows; the phase-1 system designer generalises it rather than replacing it. Surfaced in the how-it-works guide; pulled forward from phase 2 by the 2026-08-21 audit.'
  where title = 'Battery calculator: flag when the panel array can''t recharge the bank in the available sun';

-- Scope the derivation rule to the protection register so it is a tractable
-- change rather than an implied rewrite of all four calculators.
update public.roadmap_items
  set description = 'Permanent design principle, not a temporary measure pending sign-off. US product-liability law splits on whether information is a "product": Winter v. G.P. Putnam''s Sons (9th Cir. 1991) held a book''s informational content is not, and that publishers owe no general duty to verify accuracy. Saloomey v. Jeppesen and Brocklesby held aeronautical charts ARE products, because a chart mechanically converts data into an output the user acts on directly in a hazardous activity. "Recommended gauge: AWG 10" in large green type is the chart, not the book. SCOPE: this applies to the protection register (conductor gauge, overcurrent protection, cutoff voltage, voltage windows) -- see "Calculators: split output into capacity and protection registers". Capacity outputs stay confident and specific; they are the product. For protection outputs: show the code table, show the arithmetic so it can be checked, cite the source, let the user pick the installation context, and return the set of options that pass rather than a single verdict. Pairs with the disclaimer and the electrician sign-off, replaces neither -- and note that showing the derivation of a WRONG number documents the error rather than excusing it, so the correctness items are prerequisites, not alternatives.'
  where title = 'Calculators: show the derivation, never a bare recommendation';

-- ---------------------------------------------------------------------------
-- New phase-0 items — the product as shipped actively misleads
-- ---------------------------------------------------------------------------

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (0, 'calculators', 'Calculators: split output into capacity and protection registers',
   'The design decision that makes the derivation rule tractable. Classify every calculator output as either CAPACITY (daily kWh, bank kWh, panel count, inverter continuous rating -- wrong means an undersized system, not an injury) or PROTECTION (conductor gauge, fuse/breaker rating, battery cutoff voltage, string Voc vs MPPT window -- wrong starts fires or destroys equipment). Capacity outputs keep their current confident treatment: they are the product, and they are also where the affiliate value sits. Protection outputs get the full derivation treatment and never appear as a bare number. Protection is roughly five outputs, so this is a small surface -- the point of the exercise is to stop treating all four calculators as one undifferentiated liability problem.',
   'planned', 0, true, 73),

  (0, 'calculators', 'Calculators: capacity outputs are ranges, not point estimates',
   'Every headline figure is currently a point estimate with invented precision -- totalKwh.toFixed(1), panelsNeeded, adjustedKwh.toFixed(2) -- carrying no signal about how wide the real uncertainty is, when the inputs are duty-cycle guesses and annual-average sun hours. Replace with a band and say what moves it: "9-13 kWh of usable storage -- the low end if you will run lean in December, the high end for three days of autonomy; your inputs put the middle at 10.4." More honest, more useful, and much harder to characterise as a defective specification than a single decimal. Affiliate is untouched -- the component list still sits underneath. Highest-leverage single change across the chain.',
   'planned', 0, true, 74),

  (0, 'calculators', 'Calculators: fuse and breaker sizing — the fuse must protect the wire',
   'Missing, and its absence makes the AWG output actively unsafe rather than merely incomplete, which is why this is a phase-0 gate under the misleads-vs-incomplete test. The AWG calculator recommends a conductor and never states the rule that the overcurrent device must protect that conductor -- so a beginner can follow ZonZelf to a correctly sized cable and then fit a breaker that will never open before the wire melts. Add OCPD sizing as a protection-register output: continuous-load factor, the NEC 240.4(D) small-conductor caps (14 AWG 15A, 12 AWG 20A, 10 AWG 30A) that override the ampacity table, and the DC-rating requirement for breakers on the DC side. Derivation shown and cited, never a bare number.',
   'planned', 0, true, 75);

-- ---------------------------------------------------------------------------
-- Phase 1 — incomplete rather than misleading
-- ---------------------------------------------------------------------------

insert into public.roadmap_items
  (phase, category, title, description, status, dev_percent_complete, is_public, display_order)
values
  (1, 'calculators', 'System designer: one integrated sizing chain',
   'The umbrella the four calculators become: one flow from appliances to a system, with assumptions stated once and carried visibly, uncertainty shown where it enters, and a stated confidence band on the result. Integration is not cosmetic -- four tools that each look authoritative and quietly disagree is the worst configuration available, because it has the confidence of a specification and the coherence of a guess. Integration is what makes honesty structurally possible: it is the only place the chain can say "this number depends on that assumption you made three steps ago". Differentiator #1 at full strength. Depends on the phase-0 correctness items, which stay independent gates and must ship first -- do NOT let this feature absorb them.',
   'planned', 0, true, 97),

  (1, 'calculators', 'Calculators: string voltage vs MPPT input window',
   'The panel calculator says how many panels to buy and nothing about how to wire them, so a beginner can series the whole array and exceed the charge controller''s maximum input voltage -- a common and expensive way to destroy an MPPT before the system ever runs. Add a string check: panel Voc, count in series, and the cold-temperature Voc correction that catches people out (Voc RISES as temperature falls, so a string sized in July can be over the limit in January), checked against the controller''s max input. Protection-register output: show the derivation, cite the panel datasheet and controller spec, never a bare verdict. Phase 1 rather than phase 0 because it is a missing output rather than a wrong one -- but it is the first phase-1 calculator item to pick up.',
   'planned', 0, true, 98);
