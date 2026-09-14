-- Typography-only correction. 20260823000001 was written with ASCII "--" and
-- "-" where seed.sql (and every other description on the board) uses em
-- dashes, so the two disagreed the moment it was applied. Caught by diffing
-- `npm run dump:roadmap` against seed.sql, which is exactly the check
-- CLAUDE.md rule 10b exists to force.
--
-- Fixing forward rather than editing the applied migration: an edited
-- migration would leave the already-migrated staging database disagreeing
-- with what a fresh environment would produce, which is the same drift one
-- step further away. Descriptions below are copied verbatim from seed.sql.

update public.roadmap_items
  set description = 'Production gate, and the data contract the whole sizing chain rests on. Three different stories today: the load calculator publishes adjustedKwh = raw / efficiency and tells the user to carry it into both battery AND panel sizing; the battery calculator uses adjustedKwh (good) but then ignores the per-chemistry battery.efficiency field it already defines; the panel calculator uses rawKwh and applies its own efficiency (correct in isolation, to avoid double-counting). Because the stages feed each other, a disagreement here does not stay local — it multiplies down the chain, and combined with the 2-3x fridge preset a beginner can end up with a bank and an array that are both roughly twice the size they need. Pick one model, make the copy match the math, and add a test so the three pages cannot drift again. This defines the shared model the phase-1 system designer is built on, so it lands first and independently.'
  where title = 'Calculators: one efficiency model across load / battery / panels';

update public.roadmap_items
  set description = 'Production gate, and the first cross-stage check in the sizing chain. The battery and panel calculators size storage (kWh) and generation (kWh/day) independently and never check whether the array can refill the bank within the site''s peak sun hours — so a user can size a "correct" bank and a "correct" array and still under-charge every day. Add a check comparing array output over peak sun hours against the daily kWh drawn from the battery, and warn when the recharge does not close the loop. This is the pattern every later cross-stage check follows; the phase-1 system designer generalises it rather than replacing it. Surfaced in the how-it-works guide; pulled forward from phase 2 by the 2026-08-21 audit.'
  where title = 'Battery calculator: flag when the panel array can''t recharge the bank in the available sun';

update public.roadmap_items
  set description = 'Permanent design principle, not a temporary measure pending sign-off. US product-liability law splits on whether information is a "product": Winter v. G.P. Putnam''s Sons (9th Cir. 1991) held a book''s informational content is not, and that publishers owe no general duty to verify accuracy. Saloomey v. Jeppesen and Brocklesby held aeronautical charts ARE products, because a chart mechanically converts data into an output the user acts on directly in a hazardous activity. "Recommended gauge: AWG 10" in large green type is the chart, not the book. SCOPE: this applies to the protection register (conductor gauge, overcurrent protection, cutoff voltage, voltage windows) — see "Calculators: split output into capacity and protection registers". Capacity outputs stay confident and specific; they are the product. For protection outputs: show the code table, show the arithmetic so it can be checked, cite the source, let the user pick the installation context, and return the set of options that pass rather than a single verdict. Pairs with the disclaimer and the electrician sign-off, replaces neither — and note that showing the derivation of a WRONG number documents the error rather than excusing it, so the correctness items are prerequisites, not alternatives.'
  where title = 'Calculators: show the derivation, never a bare recommendation';

update public.roadmap_items
  set description = 'The design decision that makes the derivation rule tractable. Classify every calculator output as either CAPACITY (daily kWh, bank kWh, panel count, inverter continuous rating — wrong means an undersized system, not an injury) or PROTECTION (conductor gauge, fuse/breaker rating, battery cutoff voltage, string Voc vs MPPT window — wrong starts fires or destroys equipment). Capacity outputs keep their current confident treatment: they are the product, and they are also where the affiliate value sits. Protection outputs get the full derivation treatment and never appear as a bare number. Protection is roughly five outputs, so this is a small surface — the point of the exercise is to stop treating all four calculators as one undifferentiated liability problem.'
  where title = 'Calculators: split output into capacity and protection registers';

update public.roadmap_items
  set description = 'Every headline figure is currently a point estimate with invented precision — totalKwh.toFixed(1), panelsNeeded, adjustedKwh.toFixed(2) — carrying no signal about how wide the real uncertainty is, when the inputs are duty-cycle guesses and annual-average sun hours. Replace with a band and say what moves it: "9-13 kWh of usable storage — the low end if you will run lean in December, the high end for three days of autonomy; your inputs put the middle at 10.4." More honest, more useful, and much harder to characterise as a defective specification than a single decimal. Affiliate is untouched — the component list still sits underneath. Highest-leverage single change across the chain.'
  where title = 'Calculators: capacity outputs are ranges, not point estimates';

update public.roadmap_items
  set description = 'Missing, and its absence makes the AWG output actively unsafe rather than merely incomplete, which is why this is a phase-0 gate under the misleads-vs-incomplete test. The AWG calculator recommends a conductor and never states the rule that the overcurrent device must protect that conductor — so a beginner can follow ZonZelf to a correctly sized cable and then fit a breaker that will never open before the wire melts. Add OCPD sizing as a protection-register output: continuous-load factor, the NEC 240.4(D) small-conductor caps (14 AWG 15A, 12 AWG 20A, 10 AWG 30A) that override the ampacity table, and the DC-rating requirement for breakers on the DC side. Derivation shown and cited, never a bare number.'
  where title = 'Calculators: fuse and breaker sizing — the fuse must protect the wire';

update public.roadmap_items
  set description = 'The umbrella the four calculators become: one flow from appliances to a system, with assumptions stated once and carried visibly, uncertainty shown where it enters, and a stated confidence band on the result. Integration is not cosmetic — four tools that each look authoritative and quietly disagree is the worst configuration available, because it has the confidence of a specification and the coherence of a guess. Integration is what makes honesty structurally possible: it is the only place the chain can say "this number depends on that assumption you made three steps ago". Differentiator #1 at full strength. Depends on the phase-0 correctness items, which stay independent gates and must ship first — do NOT let this feature absorb them.'
  where title = 'System designer: one integrated sizing chain';

update public.roadmap_items
  set description = 'The panel calculator says how many panels to buy and nothing about how to wire them, so a beginner can series the whole array and exceed the charge controller''s maximum input voltage — a common and expensive way to destroy an MPPT before the system ever runs. Add a string check: panel Voc, count in series, and the cold-temperature Voc correction that catches people out (Voc RISES as temperature falls, so a string sized in July can be over the limit in January), checked against the controller''s max input. Protection-register output: show the derivation, cite the panel datasheet and controller spec, never a bare verdict. Phase 1 rather than phase 0 because it is a missing output rather than a wrong one — but it is the first phase-1 calculator item to pick up.'
  where title = 'Calculators: string voltage vs MPPT input window';
