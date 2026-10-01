'use client'

// Loads the published catalogue for the calculator pickers.
//
// Read through the browser client as anon: RLS returns published models only,
// with their listings and specs (supabase/migrations/20260930000001). If the
// catalogue cannot be reached or has nothing published, the pickers fall back
// to the hand-verified presets rather than going blank — those are the same
// products, admitted by the same gate, and a network blip should not take
// away a working step.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  INVERTER_PICKER_SELECT, PANEL_PICKER_SELECT,
  type CatalogInverterRow, type CatalogPanelRow,
} from './catalog-picker'
import { INVERTER_PRESETS } from './inverter-sizing'
import { PANEL_PRESETS } from './pv-string'

export type CatalogLoad<T> = { rows: T[]; loading: boolean; fromPresets: boolean }

function presetInverterRows(): CatalogInverterRow[] {
  return INVERTER_PRESETS.map((p, i) => ({
    id: -1 - i, brand: p.brand, model: p.model, mpn: null, spec_sheet_url: p.sourceUrl, image_url: null,
    component_listings: [],
    inverter_specs: {
      kind: p.kind, ac_continuous_w: p.acContinuousW, ac_surge_w: p.acSurgeW ?? null,
      ac_surge_seconds: p.acSurgeSeconds ?? null, dc_system_voltage: p.dcSystemVoltage,
      pv_max_input_v: p.pvMaxInputV, mppt_min_v: p.mpptMinV, mppt_max_v: p.mpptMaxV,
      mppt_start_v: p.mpptStartV ?? null, mppt_count: p.mpptCount, pv_max_power_w: p.pvMaxPowerW,
      pv_max_current_a: p.pvMaxCurrentA, pv_max_isc_a: p.pvMaxIscA ?? null,
      max_charge_current_a: p.maxChargeCurrentA ?? null,
    },
  }))
}

function presetPanelRows(): CatalogPanelRow[] {
  return PANEL_PRESETS.map((p, i) => ({
    id: -1 - i, brand: p.brand, model: p.model, mpn: null, spec_sheet_url: p.sourceUrl, image_url: null,
    component_listings: [],
    panel_specs: {
      watts_stc: p.wattsStc, voc_stc: p.vocStc, vmp_stc: p.vmpStc, isc_stc: p.iscStc, imp_stc: p.impStc,
      beta_voc_pct: p.betaVoc, beta_pmax_pct: p.betaPmax ?? null, beta_vmp_pct: p.betaVmp ?? null,
      max_series_fuse_a: p.maxSeriesFuseA ?? null, length_mm: null, width_mm: null, weight_kg: null, bifacial: null,
    },
  }))
}

function useCatalog<T>(category: 'panel' | 'inverter', select: string, fallback: () => T[]): CatalogLoad<T> {
  const [state, setState] = useState<CatalogLoad<T>>({ rows: [], loading: true, fromPresets: false })
  useEffect(() => {
    let cancelled = false
    createClient()
      .from('component_models')
      .select(select)
      .eq('category', category)
      .eq('is_published', true)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error(`Failed to load the ${category} catalogue:`, error.message)
        const rows = (error ? [] : (data ?? [])) as unknown as T[]
        setState(rows.length > 0
          ? { rows, loading: false, fromPresets: false }
          : { rows: fallback(), loading: false, fromPresets: true })
      })
    return () => { cancelled = true }
  }, [category, select, fallback])
  return state
}

export function useInverterCatalog() {
  return useCatalog<CatalogInverterRow>('inverter', INVERTER_PICKER_SELECT, presetInverterRows)
}

export function usePanelCatalog() {
  return useCatalog<CatalogPanelRow>('panel', PANEL_PICKER_SELECT, presetPanelRows)
}
