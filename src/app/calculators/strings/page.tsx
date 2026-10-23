import TermsGate from '@/components/auth/TermsGate'
import { getTermsAccess } from '@/lib/terms-access'
import ArrayWiringCalculator from './ArrayWiringCalculator'

export const metadata = {
  title: 'Array Wiring Calculator — ZonZelf',
  description: 'How many panels go in series and in parallel on your inverter, and when the strings need fuses.',
}

// Every calculator step is shown only to a signed-in reader who has agreed to
// the current terms. The check is here, in the page, on every request — see
// src/lib/terms-access.ts for why it is not in a layout.
export default async function Page() {
  const access = await getTermsAccess()
  if (access !== 'granted') {
    return <TermsGate access={access} next="/calculators/strings" step="array" />
  }
  return <ArrayWiringCalculator />
}
