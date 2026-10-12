/**
 * Which version of the terms is in force, and who may see protection outputs.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The capacity steps of the sizing chain (loads, battery, inverter, panels)
 * are open to everyone. The protection steps (array wiring, cable and fuse
 * sizing, commissioning) and the battery cutoff are shown only to a signed-in
 * reader who has ticked "I agree" against the CURRENT version of the terms.
 * See src/lib/calc-register.ts for the capacity / protection split, and the
 * terms_acceptances migration for where an acceptance is recorded.
 *
 * This module is pure so it can be tested and imported from either side of
 * the server boundary. The database read lives in terms-access.ts.
 */

/**
 * Bump this, and TERMS_LAST_UPDATED with it, whenever /terms or /disclaimer
 * changes in a way a reader should agree to again. Every account is then asked
 * to accept once more before the protection steps reopen; nothing else needs
 * changing. A typo fix does not need a bump.
 */
export const TERMS_VERSION = '2026-10-12'

/** TERMS_VERSION as the terms page prints it. */
export const TERMS_LAST_UPDATED = '12 October 2026'

export type TermsAccess = 'anonymous' | 'needs-acceptance' | 'granted'

/**
 * An earlier version does not count: agreeing to the terms as they stood is not
 * agreeing to the terms as they stand.
 */
export function termsAccess(
  userId: string | null,
  acceptedVersions: readonly string[],
): TermsAccess {
  if (!userId) return 'anonymous'
  return acceptedVersions.includes(TERMS_VERSION) ? 'granted' : 'needs-acceptance'
}

/**
 * The sign-up form carries the version the reader ticked through the magic
 * link, and the callback records it only if it is still the current one. A link
 * requested before a terms change and opened after it records nothing, and the
 * reader is asked again.
 */
export function isCurrentTermsVersion(value: string | null | undefined): boolean {
  return value === TERMS_VERSION
}
