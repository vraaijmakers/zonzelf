import TermsGate from '@/components/auth/TermsGate'
import { getTermsAccess } from '@/lib/terms-access'
import SystemDesign from './SystemDesign'

export const metadata = {
  title: 'Your System — ZonZelf',
  description: 'Everything you have sized in one place, with the settings to commission it.',
}

// A protection step: shown only to a signed-in reader who has agreed to the
// current terms. The check is here, in the page, on every request — see
// src/lib/terms-access.ts for why it is not in a layout.
export default async function Page() {
  const access = await getTermsAccess()
  if (access !== 'granted') {
    return <TermsGate access={access} next="/calculators/system" step="system" />
  }
  return <SystemDesign />
}
