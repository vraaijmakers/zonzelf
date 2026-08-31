/**
 * Sanity checks for a panel spec before it is admitted to PANEL_PRESETS.
 *
 * Sibling of inverter-review.ts, and the same reasoning: Voc and the Voc
 * temperature coefficient together decide a protection-register output, so a
 * transcription error here would carry the site's authority into somebody's
 * array. These catch numbers copied from the wrong row or with a sign dropped;
 * they do not verify the datasheet is real, current, or for the module in
 * front of you.
 *
 * The checks are physics-shaped, because a panel's four operating points have
 * fixed relationships. Vmp is always below Voc, Imp always below Isc, and the
 * nameplate is Vmp x Imp by definition — so a mismatch there means a row was
 * read across. The fill factor (Pmax over Voc x Isc) lands between about 0.70
 * and 0.85 for any real crystalline module: outside that, two of the four
 * numbers disagree even though each looks plausible alone.
 */

import type { PanelSpec } from './pv-string'
import type { ReviewFlag } from './battery-review'

export type { ReviewFlag }

export type PanelForReview = PanelSpec & { brand: string; model: string; sourceUrl?: string }

export function reviewPanelSpec(panel: PanelForReview): ReviewFlag[] {
  const flags: ReviewFlag[] = []
  const name = `${panel.brand} ${panel.model}`

  if (!(panel.vmpStc < panel.vocStc)) {
    flags.push({
      code: 'vmp-above-voc',
      severity: 'fail',
      message: `${name}: Vmp (${panel.vmpStc}V) is not below Voc (${panel.vocStc}V). Open circuit is always the higher voltage — these look swapped.`,
    })
  }

  if (!(panel.impStc < panel.iscStc)) {
    flags.push({
      code: 'imp-above-isc',
      severity: 'fail',
      message: `${name}: Imp (${panel.impStc}A) is not below Isc (${panel.iscStc}A). Short circuit is always the higher current — these look swapped.`,
    })
  }

  // Pmax IS Vmp x Imp. A mismatch means one of the three came off another row.
  const implied = panel.vmpStc * panel.impStc
  if (implied > 0) {
    const err = Math.abs(panel.wattsStc - implied) / panel.wattsStc
    if (err > 0.05) {
      flags.push({
        code: 'power-math',
        severity: 'fail',
        message: `${name}: Vmp x Imp is ${implied.toFixed(0)}W against a ${panel.wattsStc}W nameplate. One of the three is from the wrong row.`,
      })
    }
  }

  const fillFactor = panel.wattsStc / (panel.vocStc * panel.iscStc)
  if (!(fillFactor > 0.6 && fillFactor < 0.9)) {
    flags.push({
      code: 'fill-factor',
      severity: 'warn',
      message: `${name}: fill factor is ${fillFactor.toFixed(2)}, outside the 0.70-0.85 a real crystalline module sits in. Each number may look right alone while two of them disagree.`,
    })
  }

  // The sign is the single most consequential character on the sheet.
  if (!(panel.betaVoc < 0)) {
    flags.push({
      code: 'beta-voc-sign',
      severity: 'fail',
      message: `${name}: the Voc temperature coefficient is ${panel.betaVoc}%/degC. It must be NEGATIVE — a positive value inverts the cold-weather correction and would understate string voltage exactly when it matters.`,
    })
  } else if (panel.betaVoc < -0.6 || panel.betaVoc > -0.15) {
    flags.push({
      code: 'beta-voc-range',
      severity: 'warn',
      message: `${name}: ${panel.betaVoc}%/degC is outside the -0.20 to -0.45 typical of crystalline silicon. Check it is the Voc coefficient and not Isc's, which is positive and much smaller.`,
    })
  }

  if (panel.betaPmax !== undefined && panel.betaPmax >= 0) {
    flags.push({
      code: 'beta-pmax-sign',
      severity: 'fail',
      message: `${name}: the Pmax temperature coefficient must be negative.`,
    })
  }

  // Vmp sags harder than Voc rises, so its coefficient is the larger magnitude.
  if (panel.betaPmax !== undefined && Math.abs(panel.betaPmax) < Math.abs(panel.betaVoc)) {
    flags.push({
      code: 'beta-order',
      severity: 'warn',
      message: `${name}: the Pmax coefficient (${panel.betaPmax}) is smaller in magnitude than the Voc one (${panel.betaVoc}), which is unusual — power normally falls faster with heat than open-circuit voltage does.`,
    })
  }

  if (panel.maxSeriesFuseA !== undefined) {
    if (panel.maxSeriesFuseA < panel.iscStc) {
      flags.push({
        code: 'fuse-below-isc',
        severity: 'fail',
        message: `${name}: a ${panel.maxSeriesFuseA}A series fuse rating below the ${panel.iscStc}A Isc would blow in normal sun.`,
      })
    }
    if (panel.maxSeriesFuseA > 40) {
      flags.push({
        code: 'fuse-range',
        severity: 'warn',
        message: `${name}: ${panel.maxSeriesFuseA}A is high for a module series fuse rating, which is usually 15-25A.`,
      })
    }
  }

  if (panel.sourceUrl !== undefined) {
    try {
      if (new URL(panel.sourceUrl).protocol !== 'https:') {
        flags.push({ code: 'source-insecure', severity: 'warn', message: `${name}: sourceUrl is not https.` })
      }
    } catch {
      flags.push({ code: 'source-url-invalid', severity: 'fail', message: `${name}: sourceUrl is not a valid URL.` })
    }
  }

  return flags
}
