-- Three phase-0 security items, picked up together as "the security
-- cluster" independent of the licensed-electrician sign-off blocking the
-- calculator-correctness items.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed. src/lib/safe-redirect.ts allows only a same-site path: one leading slash, not two, and no backslash. login/page.tsx, signup/page.tsx, and callback/route.ts all route next through it before redirect(). Without it, next=@evil.com is parsed as userinfo once appended to origin (https://zonzelf.com@evil.com navigates to evil.com) and next=//evil.com is the standard protocol-relative bypass — both send an authenticated user off-site from a link that looks like our own. Verified directly against the function: both bypasses and a bare host with no leading slash collapse to "/", ordinary paths pass through unchanged.'
  where title = 'Auth: sanitize the next= redirect (open redirect)';

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed, deliberately not with a login wall: this route is called anonymously from the public load calculator, and calculators working without an account is core to the product, so "auth-gate" would break the feature it protects. Instead: an 8MB size cap (413), a MIME allowlist matching what Anthropic actually accepts — jpeg/png/webp/gif (415) — and an in-memory rate limit of 10 requests/hour per IP (429), process-local since staging and any near-term host run one container. All three verified live: a 9MB upload gets 413, an application/pdf upload gets 415, and the 11th request in an hour from one IP gets 429. The stale `const isPro = false` UI text this item cited is gone from the current code. Remaining: the privacy policy still needs to disclose that nameplate photos go to Anthropic (household images are personal data under GDPR) — that is copy, not code, and belongs with the other legal-page items.'
  where title = 'Gate /api/scan-label (auth, rate limit, size, privacy)';

update public.roadmap_items
  set status = 'in_development',
      dev_percent_complete = 60,
      description = 'Partially fixed. next.config.ts now sets X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, Referrer-Policy: origin-when-cross-origin, Permissions-Policy (camera/microphone/geolocation off), and Strict-Transport-Security — verified live via curl against every route. Content-Security-Policy is deliberately not included yet: getting it wrong silently breaks the app (hydration, Supabase auth redirects, fonts) rather than loudly, and writing one honestly needs an inventory of every script/style/font origin the app actually loads, which has not been done. Cookie flags (still whatever @supabase/ssr defaults to) are also unreviewed. Do not treat this item as closed until CSP and cookie flags are addressed.'
  where title = 'HTTP security headers';
