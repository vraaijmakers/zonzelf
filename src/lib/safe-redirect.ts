// The auth flow (login/signup pages, and the magic-link callback) carries a
// `next` URL through as a plain query param and redirects to it after
// sign-in. Left unvalidated, that's an open redirect: `next=//evil.com`
// (protocol-relative) or `next=@evil.com` (parsed as userinfo when appended
// to an origin — `https://zonzelf.com@evil.com` navigates to evil.com) both
// send an authenticated user off-site from a link that looks like our own.
//
// Only a same-site path is allowed: exactly one leading slash, and no
// backslash (some browsers treat `\` as `/`, so `/\evil.com` is the same
// bypass as `//evil.com`).
export function sanitizeNextPath(value: string | null | undefined): string {
  if (typeof value === 'string' && /^\/(?!\/|\\)/.test(value)) {
    return value
  }
  return '/'
}
