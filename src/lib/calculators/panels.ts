/**
 * Panel array sizing. Consumes the load calculator's *adjusted* kWh
 * (losses already applied) and does not apply a second efficiency factor.
 *
 * kWp = dailyKwh / peakSunHours
 * estimated harvest = panels × panelWatt × peakSun / 1000
 * (same units as the adjusted daily need).
 */

export type PeakSunExample = {
  region: string
  annual: number
  /** Darkest-month typical. Off-grid sizing should prefer this. */
  worst: number
}

export const PEAK_SUN_EXAMPLES: PeakSunExample[] = [
  { region: 'Netherlands / Belgium', annual: 2.5, worst: 0.9 },
  { region: 'UK / Ireland',          annual: 2.8, worst: 0.8 },
  { region: 'Germany / Austria',     annual: 3.0, worst: 1.0 },
  { region: 'France / Spain (N)',    annual: 4.0, worst: 1.6 },
  { region: 'Spain / Italy (S)',     annual: 5.0, worst: 2.2 },
  { region: 'Texas / Arizona (US)',  annual: 5.5, worst: 3.5 },
  { region: 'California (US)',       annual: 5.2, worst: 2.8 },
  { region: 'Florida (US)',          annual: 5.0, worst: 3.2 },
  { region: 'Canada (S)',            annual: 3.5, worst: 1.2 },
  { region: 'Australia (avg)',       annual: 5.5, worst: 3.0 },
]

export const PANEL_SIZES = [100, 200, 300, 400, 410, 450, 500, 600]

export type PanelSizing = {
  totalWattsNeeded: number
  panelsNeeded: number
  arrayWp: number
  estimatedDailyKwh: number
  surplusPct: number | null
}

export function sizePanelArray(opts: {
  dailyKwh: number
  peakSun: number
  panelWatt: number
}): PanelSizing {
  const dailyKwh = Number.isFinite(opts.dailyKwh) ? Math.max(0, opts.dailyKwh) : 0
  const peakSun = Number.isFinite(opts.peakSun) ? Math.max(0, opts.peakSun) : 0
  const panelWatt = Number.isFinite(opts.panelWatt) && opts.panelWatt > 0 ? opts.panelWatt : 400

  if (peakSun === 0) {
    return { totalWattsNeeded: 0, panelsNeeded: 0, arrayWp: 0, estimatedDailyKwh: 0, surplusPct: null }
  }

  const totalWattsNeeded = (dailyKwh * 1000) / peakSun
  const panelsNeeded = dailyKwh === 0 ? 0 : Math.ceil(totalWattsNeeded / panelWatt)
  const arrayWp = panelsNeeded * panelWatt
  const estimatedDailyKwh = (arrayWp * peakSun) / 1000
  const surplusPct = dailyKwh > 0 ? ((estimatedDailyKwh - dailyKwh) / dailyKwh) * 100 : null

  return { totalWattsNeeded, panelsNeeded, arrayWp, estimatedDailyKwh, surplusPct }
}
