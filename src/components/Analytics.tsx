import Script from 'next/script'

/**
 * Umami page-view and event tracking, on exactly the builds that set
 * NEXT_PUBLIC_UMAMI_WEBSITE_ID — production only. Local dev and staging leave
 * it unset and so load nothing, which keeps test clicks out of the numbers
 * the monetisation decision is made on.
 *
 * WHY UMAMI, AND WHY NO CONSENT BANNER. Umami sets no cookie and stores
 * nothing on the visitor's device: it counts a page view from the request
 * itself. That is what keeps ZonZelf banner-free. Adding a tool that DOES
 * store something (Google Analytics, an ad pixel, an affiliate network's
 * link-converting script, a YouTube embed) changes that, and the banner and
 * /privacy must ship in the same change — see CLAUDE.md, "Cookie consent".
 *
 * Events need no JavaScript here: Umami's tracker reports a click on any
 * element carrying `data-umami-event`, with `data-umami-event-*` attributes
 * as its properties. Grep for `data-umami-event` to find every tracked click.
 *
 * NEXT_PUBLIC_ reads are inlined at build time (see src/lib/affiliate.ts), so
 * setting the ID needs a rebuild, and it must stay a literal property access.
 */
export default function Analytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  if (!websiteId) return null

  return (
    <Script
      src="https://cloud.umami.is/script.js"
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  )
}
