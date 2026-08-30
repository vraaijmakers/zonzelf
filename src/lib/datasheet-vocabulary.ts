/**
 * The same number, under every name a manufacturer might print.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The inverter and array steps ask for about fifteen numbers, all of which are
 * on the user's datasheet, none of which are called what we call them. A real
 * session on a Sun Gold SPH10048P left five of nine fields blank — not because
 * the datasheet lacked them, but because:
 *
 *   we say "Surge / peak output"        they print "Max. Peak Power"
 *   we say "Max PV input power"         they print "Max. Input Power"
 *   we say "Max PV current per tracker" they print "Max. Input Current: 22/22 A"
 *   we say "Max battery charge current" they print "Max. PV Charge Current"
 *   we say "MPPT window, top"           they print it as the second half of
 *                                       "MPPT Operating Voltage Range 125-425"
 *
 * The person doing this had already read the whole spec sheet and still could
 * not map it. That is differentiator #1 failing in the most direct way
 * available: the tool is only usable by someone who already knows the answer.
 *
 * Two of those are worse than a naming mismatch. The MPPT range is ONE row on
 * the datasheet and TWO fields on our form, so the top number looks like it
 * belongs somewhere else — the form's fault, not the reader's. And the "22/22 A"
 * notation means 22 A on EACH of two trackers, which reads like a fraction.
 *
 * WHY IT IS ONE MODULE
 * --------------------
 * The form renders these under each field, and /guides/strings-and-mppt renders
 * the whole set as a translation table. Those must not drift, so both read from
 * here. A test checks every form field has an entry.
 *
 * The aliases are not exhaustive and never will be — they cover the wording
 * used by the brands a DIY builder actually meets (Sun Gold, EG4, Growatt,
 * Victron, Voltronic-derived units, and the usual panel manufacturers).
 */

export type DatasheetStep = 'inverter' | 'panel'

export interface DatasheetField {
  /** Matches the input id on the form, so the test can prove coverage. */
  id: string
  /** What ZonZelf calls it. */
  label: string
  /** What manufacturers print instead. First entry is the most common. */
  alsoCalled: string[]
  /** Where on the datasheet to look. */
  section: string
  step: DatasheetStep
  /** Called out when the datasheet's own formatting is the confusing part. */
  gotcha?: string
}

export const DATASHEET_FIELDS: DatasheetField[] = [
  // --- Inverter, AC side -------------------------------------------------
  {
    id: 'unit-ac-cont',
    label: 'Continuous AC output',
    alsoCalled: ['Rated Output Power', 'Rated Power', 'Continuous Power', 'Nominal Output Power', 'AC Output Rated Power'],
    section: 'Inverter output',
    step: 'inverter',
  },
  {
    id: 'unit-ac-surge',
    label: 'Surge / peak output',
    alsoCalled: ['Max. Peak Power', 'Peak Power', 'Surge Power', 'Peak Output Power', 'Max Output Power'],
    section: 'Inverter output',
    step: 'inverter',
    gotcha:
      'Usually about twice the continuous figure, and printed on the row directly under it. ' +
      'If you can see a number roughly double your rated output, that is this one.',
  },
  {
    id: 'unit-dc-label',
    label: 'Battery voltage',
    alsoCalled: ['Rated Battery Voltage', 'Nominal DC Voltage', 'Battery Nominal Voltage', 'System Voltage'],
    section: 'Battery',
    step: 'inverter',
    gotcha:
      'The NOMINAL figure — 48 V — not the operating range beside it. A 48 V unit ' +
      'usually lists something like "40-60 Vdc" as well; that is the range, not the rating.',
  },

  // --- Inverter, PV side -------------------------------------------------
  {
    id: 'unit-pv-max-v',
    label: 'Max PV input voltage',
    alsoCalled: ['Max. Open Circuit Voltage', 'Max PV Voltage', 'Max DC Input Voltage', 'Maximum PV Array Open Circuit Voltage', 'Voc max'],
    section: 'PV Input',
    step: 'inverter',
    gotcha:
      'The word to look for is OPEN CIRCUIT. This is the damage limit, and it is a ' +
      'different, higher number than the top of the MPPT range.',
  },
  {
    id: 'unit-mppt-max',
    label: 'MPPT window, top',
    alsoCalled: ['MPPT Operating Voltage Range (the second number)', 'MPPT Voltage Range', 'MPP Voltage Range', 'PV Operating Voltage Range', 'Full Power MPPT Range'],
    section: 'PV Input',
    step: 'inverter',
    gotcha:
      'This is one row on most datasheets and two boxes here. "MPPT Operating Voltage ' +
      'Range 125-425 Vdc" means 125 in the bottom box and 425 in this one.',
  },
  {
    id: 'unit-mppt-min',
    label: 'MPPT window, bottom',
    alsoCalled: ['MPPT Operating Voltage Range (the first number)', 'MPPT Voltage Range', 'Minimum MPPT Voltage', 'PV Operating Voltage Range'],
    section: 'PV Input',
    step: 'inverter',
  },
  {
    id: 'unit-mppt-start',
    label: 'Start-up voltage',
    alsoCalled: ['PV Start Voltage', 'Startup Voltage', 'Start Voltage', 'Minimum Input Voltage'],
    section: 'PV Input',
    step: 'inverter',
    gotcha: 'Often not stated at all. Leave it blank rather than guessing.',
  },
  {
    id: 'unit-pv-power',
    label: 'Max PV input power',
    alsoCalled: ['Max. Input Power', 'Max PV Power', 'Max PV Array Power', 'Max Solar Input Power', 'Recommended PV Power'],
    section: 'PV Input',
    step: 'inverter',
    gotcha:
      'Watts, and usually the total across all trackers. It is often noticeably larger ' +
      'than the AC output rating — an 10 kW unit taking 11 kW of panel is normal.',
  },
  {
    id: 'unit-pv-current',
    label: 'Max PV current per tracker',
    alsoCalled: ['Max. Input Current', 'Max PV Input Current', 'Max Current per MPPT', 'Max Isc per MPPT'],
    section: 'PV Input',
    step: 'inverter',
    gotcha:
      'On a two-tracker unit this is often written "22/22 A". That is 22 A on EACH ' +
      'tracker, not 22 divided by anything and not 44 A in total. Enter 22.',
  },
  {
    id: 'unit-charge',
    label: 'Max battery charge current',
    alsoCalled: ['Max. PV Charge Current', 'Max Charge Current', 'Max Battery Charging Current', 'Max Solar Charge Current'],
    section: 'Battery',
    step: 'inverter',
    gotcha:
      'A hybrid unit may list three: from PV, from the grid/generator, and hybrid (both ' +
      'at once). The PV one is what belongs here.',
  },
  {
    id: 'unit-mppt-count',
    label: 'Number of MPPTs',
    alsoCalled: ['No. of MPPT Trackers', 'MPPT Trackers', 'Number of MPP Trackers', 'MPPT Quantity'],
    section: 'PV Input',
    step: 'inverter',
  },

  // --- Panel -------------------------------------------------------------
  {
    id: 'panel-w',
    label: 'Rated power (Pmax)',
    alsoCalled: ['Maximum Power', 'Pmax', 'Nominal Power', 'Peak Power (Wp)', 'Module Power'],
    section: 'Electrical characteristics at STC',
    step: 'panel',
  },
  {
    id: 'panel-voc',
    label: 'Open-circuit voltage (Voc)',
    alsoCalled: ['Open Circuit Voltage', 'Voc'],
    section: 'Electrical characteristics at STC',
    step: 'panel',
    gotcha:
      'Take the STC figure, not the NOCT one beside it. NOCT is a warmer, lower ' +
      'number and using it would understate your cold-morning voltage.',
  },
  {
    id: 'panel-vmp',
    label: 'Voltage at max power (Vmp)',
    alsoCalled: ['Voltage at Pmax', 'Vmp', 'Vmpp', 'Maximum Power Voltage', 'Optimum Operating Voltage'],
    section: 'Electrical characteristics at STC',
    step: 'panel',
  },
  {
    id: 'panel-isc',
    label: 'Short-circuit current (Isc)',
    alsoCalled: ['Short Circuit Current', 'Isc'],
    section: 'Electrical characteristics at STC',
    step: 'panel',
  },
  {
    id: 'panel-imp',
    label: 'Current at max power (Imp)',
    alsoCalled: ['Current at Pmax', 'Imp', 'Impp', 'Maximum Power Current', 'Optimum Operating Current'],
    section: 'Electrical characteristics at STC',
    step: 'panel',
  },
  {
    id: 'panel-bvoc',
    label: 'Voc temperature coefficient',
    alsoCalled: ['Temperature Coefficient of Voc', 'TC of Voc', 'Temp. Coefficient (Voc)', 'β Voc'],
    section: 'Temperature characteristics',
    step: 'panel',
    gotcha:
      'A negative percentage per degree, like -0.28 %/°C. Enter the minus sign — without ' +
      'it the maths runs backwards and says cold weather LOWERS your voltage.',
  },
  {
    id: 'panel-bpmax',
    label: 'Pmax temperature coefficient',
    alsoCalled: ['Temperature Coefficient of Pmax', 'TC of Pmax', 'Power Temperature Coefficient', 'γ Pmax'],
    section: 'Temperature characteristics',
    step: 'panel',
  },
  {
    id: 'panel-fuse',
    label: 'Max series fuse rating',
    alsoCalled: ['Maximum Series Fuse Rating', 'Max Fuse Rating', 'Maximum Overcurrent Protection Rating', 'Series Fuse Rating'],
    section: 'Maximum ratings',
    step: 'panel',
    gotcha:
      'Near the bottom of the datasheet with the mechanical data, not with the electrical ' +
      'characteristics. Commonly 15 A, 20 A or 25 A.',
  },
]

export function fieldHelp(id: string): DatasheetField | undefined {
  return DATASHEET_FIELDS.find(f => f.id === id)
}

export function fieldsFor(step: DatasheetStep): DatasheetField[] {
  return DATASHEET_FIELDS.filter(f => f.step === step)
}
