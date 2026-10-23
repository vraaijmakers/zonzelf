import TermsGate from '@/components/auth/TermsGate'
import { getTermsAccess } from '@/lib/terms-access'
import LoadCalculator from './LoadCalculator'

export const metadata = {
  title: 'Load Calculator — ZonZelf',
  description: 'What you use in a day, appliance by appliance.',
}

// Every calculator step is shown only to a signed-in reader who has agreed to
// the current terms. The check is here, in the page, on every request — see
// src/lib/terms-access.ts for why it is not in a layout.
export default async function Page() {
  const access = await getTermsAccess()
  if (access !== 'granted') {
    return <TermsGate access={access} next="/calculators/load" step="load" />
  }
  return <LoadCalculator />
}
