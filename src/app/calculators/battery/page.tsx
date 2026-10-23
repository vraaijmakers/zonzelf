import TermsGate from '@/components/auth/TermsGate'
import { getTermsAccess } from '@/lib/terms-access'
import BatteryCalculator from './BatteryCalculator'

export const metadata = {
  title: 'Battery Sizing Calculator — ZonZelf',
  description: 'How big a battery bank you need to ride out the night and the grey days.',
}

// Every calculator step is shown only to a signed-in reader who has agreed to
// the current terms. The check is here, in the page, on every request — see
// src/lib/terms-access.ts for why it is not in a layout.
export default async function Page() {
  const access = await getTermsAccess()
  if (access !== 'granted') {
    return <TermsGate access={access} next="/calculators/battery" step="battery" />
  }
  return <BatteryCalculator />
}
