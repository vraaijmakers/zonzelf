/**
 * Celsius and Fahrenheit, and the three places the conversion goes wrong.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * ZonZelf is a US LLC with a US-first audience working to the NEC, and every
 * temperature on the site was Celsius. That is the wrong default for the
 * people it is written for.
 *
 * But a blanket find-and-replace on "degC" would break three things, and each
 * of them silently:
 *
 * 1. A DIFFERENCE IS NOT A POINT ON THE SCALE.
 *    "Cell rise in sun: 30 degC" means the panel runs 30 degrees HOTTER than
 *    the air. That is a delta, and converting it with the +32 offset gives
 *    86 degF, which is nonsense — the right answer is 54 degF. Absolute
 *    temperatures and temperature differences need different functions, so
 *    this module provides both and names them clearly.
 *
 * 2. SOME "TEMPERATURES" ARE NAMES, NOT MEASUREMENTS.
 *    The 60/75/90 degC terminal ratings are the names of NEC Table 310.16's
 *    ampacity columns. They are printed on cable jackets and lugs as degC
 *    everywhere on earth, including the US. Rendering them as 140/167/194 degF
 *    would make the calculator disagree with the label in the user's hand.
 *    Same for "30 degC ambient", which is how the table itself is cited.
 *    These stay Celsius, always.
 *
 * 3. TEMPERATURE COEFFICIENTS ARE PUBLISHED PER DEGREE CELSIUS.
 *    Every panel datasheet gives Voc drift as %/degC, because IEC 61215 says
 *    so. A coefficient in %/degF exists arithmetically (multiply by 5/9) and
 *    appears on no datasheet, so converting it would leave the user unable to
 *    match our number against theirs. Coefficients stay %/degC, and the
 *    formulas that use them are shown in Celsius with the Fahrenheit value
 *    alongside for orientation.
 *
 * THE STORAGE RULE
 * ----------------
 * Everything is STORED in Celsius, always, and converted only for display and
 * at input. The physics runs in Celsius because the coefficients do. Storing
 * the user's display unit would mean every calculation had to know which unit
 * its inputs were in, which is exactly how a unit bug gets in.
 */

export type TempUnit = 'C' | 'F'

/** US-first audience, per CLAUDE.md. The toggle is always one click away. */
export const DEFAULT_TEMP_UNIT: TempUnit = 'F'

/** A point on the scale. Carries the offset. */
export function cToF(c: number): number {
  return c * 9 / 5 + 32
}

export function fToC(f: number): number {
  return (f - 32) * 5 / 9
}

/**
 * A DIFFERENCE between two temperatures. No offset — a 30 degree rise is 54
 * Fahrenheit degrees, not 86. Getting this wrong is the classic unit bug and
 * it is silent, because 86 is a perfectly plausible-looking number.
 */
export function deltaCToF(c: number): number {
  return c * 9 / 5
}

export function deltaFToC(f: number): number {
  return f * 5 / 9
}

export const unitLabel = (unit: TempUnit): string => (unit === 'F' ? '°F' : '°C')

const round = (n: number, dp: number) => {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

/** An absolute temperature in the user's unit, as a number. */
export function toDisplay(c: number, unit: TempUnit): number {
  return unit === 'F' ? Math.round(cToF(c)) : round(c, 1)
}

/** Back to Celsius for storage. */
export function fromDisplay(value: number, unit: TempUnit): number {
  return unit === 'F' ? round(fToC(value), 2) : value
}

/** A temperature difference in the user's unit, as a number. */
export function deltaToDisplay(c: number, unit: TempUnit): number {
  return unit === 'F' ? Math.round(deltaCToF(c)) : round(c, 1)
}

export function deltaFromDisplay(value: number, unit: TempUnit): number {
  return unit === 'F' ? round(deltaFToC(value), 2) : value
}

/** An absolute temperature, formatted with its unit. */
export function formatTemp(c: number, unit: TempUnit): string {
  return `${toDisplay(c, unit)}${unitLabel(unit)}`
}

/** A temperature difference, formatted with its unit. */
export function formatDelta(c: number, unit: TempUnit): string {
  return `${deltaToDisplay(c, unit)}${unitLabel(unit)}`
}

/**
 * Both units, for the one place they have to appear together: a formula whose
 * coefficient is per degree Celsius but whose reader thinks in Fahrenheit.
 * Returns just the one string when the user is already on Celsius.
 */
export function formatBoth(c: number, unit: TempUnit): string {
  if (unit === 'C') return `${round(c, 1)}°C`
  return `${Math.round(cToF(c))}°F (${round(c, 1)}°C)`
}

export const COEFFICIENT_UNIT_NOTE =
  'Temperature coefficients are published per degree CELSIUS on every datasheet — IEC 61215 ' +
  'requires it — so the formulas below stay in Celsius even when the rest of the page is in ' +
  'Fahrenheit. Converting the coefficient would leave you unable to match our figure against ' +
  'the one on your panel.'

export const TERMINAL_RATING_NOTE =
  'The 60/75/90 °C terminal ratings are the names of NEC Table 310.16 columns, not a ' +
  'measurement to convert. They are stamped on lugs and cable jackets in Celsius in the US too, ' +
  'so they stay as they are printed.'
