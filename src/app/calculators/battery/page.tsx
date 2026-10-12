import { getTermsAccess } from '@/lib/terms-access'
import BatteryCalculator from './BatteryCalculator'

export const metadata = {
  title: 'Battery Sizing Calculator — ZonZelf',
  description: 'How big a battery bank you need to ride out the night and the grey days.',
}

// Sizing the bank is a capacity answer and stays open to everyone. The cutoff
// card on this page is a protection output, so the calculator is told whether
// this reader may see it.
export default async function Page() {
  const access = await getTermsAccess()
  return <BatteryCalculator protectionAccess={access} />
}
