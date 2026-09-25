/**
 * A scraped battery's product photo, as stored in battery_models.image_url.
 *
 * Plain <img>, not next/image, and deliberately: next/image requires every
 * vendor CDN to be listed in next.config.ts `images.remotePatterns` before it
 * will render, so adding a scraper would silently blank the thumbnails of the
 * brand it added until someone remembered the config. It would also route
 * vendor images through this app's optimizer, which for an admin-only page
 * behind is_admin() buys nothing. referrerPolicy keeps the admin URL out of
 * the vendor's logs.
 */

const SIZES = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
} as const

export default function ProductPhoto({
  src,
  alt,
  size = 'md',
}: {
  src: string | null
  alt: string
  size?: keyof typeof SIZES
}) {
  const box = `${SIZES[size]} shrink-0 rounded border border-zon-rule bg-zon-paper`

  if (!src) {
    return (
      <div
        className={`${box} flex items-center justify-center text-center text-[9px] leading-tight text-zon-muted px-1`}
        // Not an <img> with a broken src: "no photo yet" is a fact about the
        // scrape, and it should read as one rather than as a failed load.
      >
        No photo
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- see the note at the top of this file
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${box} object-contain`}
    />
  )
}
