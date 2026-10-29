import type { Metadata } from 'next'
import CheatSheetView from '@/components/calculators/CheatSheetView'

export const metadata: Metadata = {
  title: 'Commissioning cheat sheet | ZonZelf',
  description:
    'A printable field sheet for your battery bank and inverter: which socket goes where, each pack\'s address, the LCD settings, and the checks.',
}

export default function CheatSheetPage() {
  return <CheatSheetView />
}
