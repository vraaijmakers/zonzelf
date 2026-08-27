-- The calculators outran the teaching. Found by asking a simple question:
-- where in the app is any of this explained?
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_development',
      dev_percent_complete = 25,
      description = 'Plain-English explainers woven into guides and calculators, not a separate wizard. Differentiator #1. Started 2026-08-25 after an audit of where each concept actually appears found the calculators had outrun the teaching badly: duty cycle, load profiles, the three-stage efficiency chain, the battery scenario band, dark hours and the cooling/heating asymmetry were all enforced by tools and explained on no page at all, and the glossary — whose entire job this is — defined none of the new vocabulary. A beginner met "Duty %", "Runs: Cooling" and "156% of Isc" with nowhere to look them up, which is differentiator #1 inverted. Done: the glossary gained ampacity, autonomy, continuous load, design current, duty cycle, Isc, OCPD and round-trip efficiency, cross-linked to the calculators and guides that use them; the wiring guide gained the 125% continuous rule and the 156% PV rule. Remaining: the efficiency chain belongs in /guides/how-it-works, and the autonomy-vs-overnight distinction plus the cooling/heating asymmetry belong with battery sizing. No test can tell you an explanation is clear, so this one is verified by a person reading it.'
  where title = 'Guided beginner onboarding';
