-- Overcurrent protection, and the conductor-sizing defect that adding it found.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed. src/lib/overcurrent.ts sizes the fuse or breaker between two bounds — at least 125% of a continuous load (NEC 210.20(A)), at most the conductor ampacity after the 240.4(D) small-conductor caps — and returns the standard NEC 240.6(A) ratings that fit, as a set rather than a verdict. A PV source circuit takes the 156% of NEC 690.8(A) instead: 125% for irradiance above nameplate, then 125% again for continuous duty. When no standard device fits, the page says the conductor is too small and names the thinner one that works, because the answer is thicker cable and never a bigger breaker. NEC 240.4(B) rounding up past ampacity is deliberately NOT applied — its conditions cannot be established from the inputs, so the conservative reading ships and the page says an electrician may go one size higher. A DC-rating warning is shown: an AC-only breaker will not break a DC fault, which is the most common dangerous substitution in DIY off-grid work. Adding this exposed a real defect in the AWG calculator, now also fixed: NEC 210.19(A)(1) requires the CONDUCTOR to be sized at 125% of a continuous load, not only its protection, and the calculator was checking bare ampacity. It presented 10 AWG as adequate for a 30 A continuous load, which no legal device can protect. Both bounds now derive from one shared factor, and a test asserts that anything the calculator presents can actually be protected. Not modelled: ambient derates above 30 °C, conduit fill, motor and transformer circuits, and interrupting rating.'
  where title = 'Calculators: fuse and breaker sizing — the fuse must protect the wire';

update public.roadmap_items
  set dev_percent_complete = 85,
      description = 'npm test runs in CI on every PR. 80 tests across five modules. The newest lock the overcurrent contract: a device never exceeds what the conductor can carry, never falls below 125% of a continuous load, a PV string needs a 20 A device where a naive 15 A would be chosen, an unprotectable conductor is reported rather than papered over, every returned rating is a real purchasable NEC 240.6(A) size, and — the cross-module contract — anything the AWG calculator presents as passing can actually be protected. Still uncovered: the panel count and peak-sun maths, reviewBatteryModel() flags, and anything at the page level.'
  where title = 'Unit tests for calculator math and battery-review';
