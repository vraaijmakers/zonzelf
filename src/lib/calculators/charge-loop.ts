/**
 * Closes the loop the battery and panel calculators used to leave open:
 * can this array actually replace today's draw in the available sun?
 *
 * Compares estimated daily harvest (kWh) against the daily need the battery
 * is sized for (adjusted kWh). Days of autonomy are a buffer, not a reason
 * the array can undersize — a short array slowly empties the bank.
 */

export type ChargeLoop = {
  dailyNeedKwh: number
  estimatedDailyKwh: number
  ratio: number | null
  shortfallKwh: number
  /** Harvest covers the daily draw. */
  coversDaily: boolean
  /** Covers daily with a bit of headroom (20%). Cloudy-day cushion. */
  coversWithMargin: boolean
}

export function chargeLoop(opts: {
  dailyNeedKwh: number
  estimatedDailyKwh: number
}): ChargeLoop {
  const dailyNeedKwh = Number.isFinite(opts.dailyNeedKwh) ? Math.max(0, opts.dailyNeedKwh) : 0
  const estimatedDailyKwh = Number.isFinite(opts.estimatedDailyKwh) ? Math.max(0, opts.estimatedDailyKwh) : 0
  const ratio = dailyNeedKwh > 0 ? estimatedDailyKwh / dailyNeedKwh : null
  const shortfallKwh = Math.max(0, dailyNeedKwh - estimatedDailyKwh)
  const coversDaily = ratio != null && ratio >= 1
  const coversWithMargin = ratio != null && ratio >= 1.2

  return { dailyNeedKwh, estimatedDailyKwh, ratio, shortfallKwh, coversDaily, coversWithMargin }
}
