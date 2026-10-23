import TermsGate from '@/components/auth/TermsGate'
import { getTermsAccess } from '@/lib/terms-access'
import PanelCalculator from './PanelCalculator'

export const metadata = {
  title: 'Panel Sizing Calculator — ZonZelf',
  description: 'How many panels refill the bank in the sun you actually get.',
}

// Every calculator step is shown only to a signed-in reader who has agreed to
// the current terms. The check is here, in the page, on every request — see
// src/lib/terms-access.ts for why it is not in a layout.
export default async function Page() {
  const access = await getTermsAccess()
  if (access !== 'granted') {
    return <TermsGate access={access} next="/calculators/panels" step="panels" />
  }
  return <PanelCalculator />
}
