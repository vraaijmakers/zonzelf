-- Docs hygiene: TECH-STACK.md, .env.example and the CLAUDE.md hosting line
-- described intentions rather than what exists.
--
-- Keep in sync with supabase/seed.sql (CI enforces this).

update public.roadmap_items
  set status = 'in_test',
      dev_percent_complete = 90,
      description = 'Fixed. TECH-STACK.md listed Vercel hosting, Prisma and Playwright — none of which were ever set up — and a session followed it. It now states Next.js 16.3.1, no ORM, fetch + cheerio scraping, node:test via tsx, GitHub Actions, self-hosted Docker staging, and production explicitly NOT CONFIGURED, with a note that the table describes what exists rather than what was intended. .env.example no longer says to set values in Vercel, and no longer claims the service-role key is unused two lines before defining it for the scrapers. CLAUDE.md said staging was planned in one paragraph and described it deploying in the next; it now says staging is live and production is not chosen. The architecture tree and the /admin status were corrected earlier. Remaining: the CLAUDE.md file tree does not list the newer src/lib modules, which is cosmetic.'
  where title = 'Docs hygiene: CLAUDE.md, TECH-STACK, .env.example';
