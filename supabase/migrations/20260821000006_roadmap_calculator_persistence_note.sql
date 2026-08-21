-- Surfaced 2026-08-21: calculator inputs (src/lib/calc-storage.ts) are saved
-- to window.localStorage only, with no association to the logged-in user at
-- all. Two accounts open in the same browser see the same data; the same
-- account in two different browsers sees none of it. Noticed because two
-- of Vincent's own accounts appeared to be "sharing" load-calculator data —
-- they were really just sharing a browser. Folded into the existing
-- dashboard item rather than filed separately, since that's the feature
-- that actually fixes it (server-side, per-account persistence).

update public.roadmap_items
  set description = '/dashboard ("My Projects") does not exist yet. Needed before Live Monitoring can be un-disabled on the homepage. Also the fix for calculator inputs only being saved to the browser''s localStorage today — not tied to the logged-in account at all, so two accounts in the same browser see the same data, and the same account in two different browsers sees none of it.'
  where title = 'User dashboard shell';
