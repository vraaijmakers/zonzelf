import TermsGate from '@/components/auth/TermsGate'
import { getTermsAccess } from '@/lib/terms-access'
import AwgCalculator from './AwgCalculator'

export const metadata = {
  title: 'Cable AWG Calculator — ZonZelf',
  description: 'Which cable sizes your run allows, and the fuse or breaker that protects them.',
}

// Every calculator step is shown only to a signed-in reader who has agreed to
// the current terms. The check is here, in the page, on every request — see
// src/lib/terms-access.ts for why it is not in a layout.
export default async function Page() {
  const access = await getTermsAccess()
  if (access !== 'granted') {
    return <TermsGate access={access} next="/calculators/awg" step="protection" />
  }
  return <AwgCalculator />
}
