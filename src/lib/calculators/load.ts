/**
 * Load calculator math. System efficiency is applied HERE, once.
 * Battery and panel sizing consume `adjustedKwh` and must not apply
 * another efficiency factor on top (see battery.ts / panels.ts).
 */

export type LoadRow = {
  watts: number
  hours: number
  qty: number
}

export type LoadTotals = {
  rawKwh: number
  adjustedKwh: number
  totalWh: number
}

/** Clamp to the slider range the UI exposes. */
export function clampEfficiency(efficiency: number): number {
  if (!Number.isFinite(efficiency)) return 0.8
  return Math.min(0.95, Math.max(0.6, efficiency))
}

export function loadTotals(rows: LoadRow[], efficiency: number): LoadTotals {
  const totalWh = rows.reduce((sum, row) => {
    const watts = Number.isFinite(row.watts) ? Math.max(0, row.watts) : 0
    const hours = Number.isFinite(row.hours) ? Math.min(24, Math.max(0, row.hours)) : 0
    const qty = Number.isFinite(row.qty) ? Math.max(0, row.qty) : 0
    return sum + watts * hours * qty
  }, 0)

  const rawKwh = totalWh / 1000
  const eff = clampEfficiency(efficiency)
  const adjustedKwh = rawKwh / eff

  return { rawKwh, adjustedKwh, totalWh }
}

export type PresetItem = {
  name: string
  watts: number
  hours: number
  /** Cycling loads (fridges, some A/C) — hours are duty-cycle equivalent, not 24h nameplate. */
  cycling?: boolean
}

export type PresetGroup = {
  label: string
  icon?: 'ac'
  items: PresetItem[]
}

/**
 * Hours for cycling appliances are a typical duty-cycle equivalent, not
 * nameplate watts × 24. A 150W fridge that actually runs ~8h/day is ~1.2 kWh,
 * not 3.6 kWh.
 */
export const PRESET_GROUPS: PresetGroup[] = [
  {
    label: 'Lighting & fans',
    items: [
      { name: 'LED light bulb',     watts: 10,  hours: 5 },
      { name: 'LED tube light',     watts: 20,  hours: 6 },
      { name: 'Ceiling fan',        watts: 60,  hours: 8 },
      { name: 'Bathroom exhaust',   watts: 30,  hours: 2 },
    ],
  },
  {
    label: 'Cooling (A/C)',
    icon: 'ac',
    items: [
      { name: 'Window AC (5,000 BTU)',      watts: 450,  hours: 8 },
      { name: 'Window AC (8,000 BTU)',      watts: 700,  hours: 8 },
      { name: 'Window AC (12,000 BTU)',     watts: 1100, hours: 8 },
      { name: 'Portable AC (10,000 BTU)',   watts: 1000, hours: 8 },
      { name: 'Mini-split (9,000 BTU)',     watts: 860,  hours: 10 },
      { name: 'Mini-split (12,000 BTU)',    watts: 1100, hours: 10 },
      { name: 'Mini-split (18,000 BTU)',    watts: 1600, hours: 10 },
      { name: 'Mini-split (24,000 BTU)',    watts: 2100, hours: 10 },
      { name: 'Central AC (2 ton)',         watts: 2500, hours: 8 },
      { name: 'Central AC (3 ton)',         watts: 3500, hours: 8 },
      { name: 'Central AC (4 ton)',         watts: 4700, hours: 8 },
      { name: 'Central AC (5 ton)',         watts: 6000, hours: 8 },
      { name: 'Central AC (6 ton)',         watts: 7200, hours: 8 },
      { name: 'Central AC (7.5 ton)',       watts: 9000, hours: 8 },
    ],
  },
  {
    label: 'Kitchen',
    items: [
      { name: 'Mini fridge',        watts: 80,   hours: 8, cycling: true },
      { name: 'Full-size fridge',   watts: 150,  hours: 8, cycling: true },
      { name: 'Microwave',          watts: 1000, hours: 0.5 },
      { name: 'Coffee maker',       watts: 900,  hours: 0.25 },
      { name: 'Toaster',            watts: 850,  hours: 0.1 },
      { name: 'Induction cooktop',  watts: 1800, hours: 1 },
    ],
  },
  {
    label: 'Entertainment & office',
    items: [
      { name: 'TV (32")',           watts: 40,  hours: 4 },
      { name: 'TV (55")',           watts: 100, hours: 4 },
      { name: 'Laptop',             watts: 65,  hours: 6 },
      { name: 'Desktop PC',         watts: 200, hours: 4 },
      { name: 'Phone charger',      watts: 10,  hours: 2 },
      { name: 'Router / modem',     watts: 15,  hours: 24 },
    ],
  },
  {
    label: 'Water & utility',
    items: [
      { name: 'Water pump (small)', watts: 300, hours: 1 },
      { name: 'Water pump (1 HP)',  watts: 750, hours: 2 },
      { name: 'Washing machine',    watts: 500, hours: 1 },
      { name: 'Clothes dryer',      watts: 5000, hours: 0.75 },
      { name: 'Dishwasher',         watts: 1200, hours: 1 },
      { name: 'Water heater (elec)',watts: 4000, hours: 1 },
    ],
  },
  {
    label: 'Other',
    items: [
      { name: 'CPAP machine',       watts: 30,  hours: 8 },
      { name: 'Power tool (drill)', watts: 600, hours: 0.5 },
      { name: 'EV charger (L1)',    watts: 1400, hours: 6 },
      { name: 'EV charger (L2)',    watts: 7200, hours: 2 },
    ],
  },
]

export const PRESETS: PresetItem[] = PRESET_GROUPS.flatMap(g => g.items)
