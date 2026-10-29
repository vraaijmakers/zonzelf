/**
 * The commissioning procedure, folded into something you print and carry.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The System step is a screen. The person who needs it is standing at a rack
 * with five packs, a bag of patch cables and no signal. The first cheat sheet
 * was written by hand for exactly that trip (2026-10-29), and the questions it
 * answered — which socket goes to the inverter, which way the chain runs, what
 * each DIP switch reads, what stays empty — are the ones the screen version
 * scattered across five cards.
 *
 * This module builds the same sheet from the commissioning map, so every
 * value on paper is the value on the screen. It adds nothing the map does
 * not already say, except the field-trip framing: an order of work that
 * includes the packs, a cable shopping list, and the WiFi module.
 *
 * GATE. Same as the map: an admitted pairing or nothing. A cheat sheet with
 * guessed menu numbers is worse than no cheat sheet, because it gets printed.
 */

import type { BatteryPreset } from './battery-preset'
import {
  bankWiring, type BankRow, type CommissioningMap, type CommissioningPair,
  type FaultCode, type PinTable, type SettingRow, type WorkModeOption,
} from './commissioning'

export interface InverterPort {
  name: string
  use: 'this' | 'not' | 'other'
  note?: string
}

export interface MonitoringGuide {
  /** Where the module plugs in, as labelled. */
  port: string
  rules: { title: string; body: string }[]
  /** Module label → app. The inverter manual never names the app. */
  apps: { label: string; app: string }[]
  /** Which module the setup steps below are written for. */
  stepsFor: string
  before: string[]
  steps: string[]
  trouble: { problem: string; fix: string }[]
  writeDown: string[]
  sources: string[]
}

export interface CheatSheet {
  title: string
  inverterModel: string
  batteryModel: string
  /** Undefined when the bank size is unknown — the sheet says so, never guesses. */
  packCount?: number
  /** The three things to remember if you remember nothing else. */
  rules: { title: string; body: string; tone: 'gold' | 'plain' | 'stop' }[]
  bank: BankRow[]
  upstreamSocket: string
  /** The inverter's comms ports, so the right one is unmistakable. */
  inverterPorts: InverterPort[]
  cables: string[]
  order: string[]
  settings: SettingRow[]
  workModes: WorkModeOption[]
  checks: string[]
  faults: FaultCode[]
  pins: PinTable[]
  /** The other bus, and the one thing to know before using it. */
  planB?: string
  monitoring?: MonitoringGuide
  sources: string[]
}

/** SPH8-10KW User Manual V1.3 §6.1, §6.3. Only the ports a comms cable could land in. */
const SPH_PORTS: InverterPort[] = [
  { name: 'USB-B', use: 'other' },
  { name: 'WIFI', use: 'not', note: 'pin 1 carries 5 V' },
  { name: 'RS485/CAN', use: 'this' },
  { name: 'Dry contact', use: 'other' },
  { name: 'Parallel', use: 'not', note: 'links two inverters' },
]

/**
 * The SPH manual (§6.3) says only that the WIFI port takes "the Wi-Fi/GPRS
 * data acquisition module" and that you view data "via the mobile APP". It
 * never names the app, and Sun Gold's own WiFi-module page says that module
 * is for the 3 kW / 5 kW units. So the app is decided by the stick's label.
 * The LSW-5 steps are from SOLARMAN's own quick guide.
 */
const SPH_MONITORING: MonitoringGuide = {
  port: 'WIFI',
  rules: [
    { title: 'Its own port', body: 'The module goes in the inverter\'s WIFI port, not the RS485/CAN port the batteries use.' },
    { title: '2.4 GHz WiFi with internet', body: 'The module cannot use 5 GHz, and the app reads your data over the internet, so the site needs a working connection.' },
    { title: 'Leave item 32 alone', body: 'Item 32 sets the battery port. The WiFi module has its own, so do not change 32 for it.' },
  ],
  apps: [
    { label: 'SOLARMAN, "Stick Logger", LSW-5', app: 'SOLARMAN Smart — the steps on this sheet' },
    { label: 'Anything else', app: 'The app named on its label or quick-start card. Owners of other Sun Gold models report SmartESS or Solar Touch; the steps here will not match exactly.' },
  ],
  stepsFor: 'SOLARMAN LSW-5',
  before: [
    'Install the app and create an account while you have good signal.',
    'Know the site WiFi\'s name and password, and check that it is a 2.4 GHz network.',
    'Find the module\'s serial number (SN) on the stick or its packaging and write it below.',
  ],
  steps: [
    'Plug the stick into the inverter\'s WIFI port. The inverter can stay on. The COM light should go steady and the Ready light flash.',
    'Put your phone on the site WiFi, standing near the inverter. Keep the router within about 30 ft (10 m) of the stick.',
    'In SOLARMAN Smart: log in, create a plant, then add a logger by scanning the SN barcode or typing it in.',
    'Enter the WiFi name and password when the app asks, and let it finish. Readings can take a few minutes to appear.',
    'Check that battery voltage and SOC in the app match the inverter\'s screen.',
  ],
  trouble: [
    { problem: 'The app will not connect', fix: 'Join the stick\'s own WiFi, named AP_ followed by its serial number (password on the label). Open 10.10.100.254 in a browser, log in as admin / admin, and enter the site WiFi in the setup wizard.' },
    { problem: '"Serial number already in use"', fix: 'The stick is tied to another account, for example a returned unit. Only SOLARMAN support can release it.' },
    { problem: 'Only 5 GHz on site', fix: 'Turn on the router\'s 2.4 GHz band, or give it its own network name.' },
    { problem: 'Connects but shows no data', fix: 'Write down what item 32 is set to. Battery comms on 485 alongside the WiFi module has not been confirmed on this inverter. Keep the batteries working and report it, rather than switching 32 back.' },
  ],
  writeDown: ['Module SN', 'Module model', 'WiFi network', 'Plant name in app', 'App account email'],
  sources: [
    'Sun Gold SPH8-10KW User Manual V1.3 §6.3 (WIFI port)',
    'SOLARMAN LSW-5 Stick Logger quick guide (LEDs, SN, 2.4 GHz, AP mode at 10.10.100.254)',
  ],
}

export function cheatSheet(pair: CommissioningPair, map: CommissioningMap, packCount?: number): CheatSheet {
  const { battery } = pair
  const w = battery.bmsWiring
  if (!w) throw new Error(`${battery.model} is admitted without bmsWiring`)
  const step = (id: string) => {
    const found = map.steps.find(s => s.id === id)
    if (!found) throw new Error(`commissioning map has no ${id} step`)
    return found
  }
  const n = packCount
  const many = n === undefined || n > 1
  const lead = w.upstream[w.preferredBus] ?? w.upstream.can ?? w.upstream.rs485!
  const otherBus = w.preferredBus === 'rs485' ? 'can' : 'rs485'
  const other = w.upstream[otherBus]
  const bank = n !== undefined ? bankWiring(battery, n) : []
  const links = n !== undefined ? Math.max(0, bank.length - 1) : undefined

  const rules: CheatSheet['rules'] = [
    { title: 'One cable to the inverter', body: `${many ? 'Pack 1\'s' : 'The pack\'s'} ${lead} → the inverter's RS485/CAN port.${many ? ' Only pack 1.' : ''}`, tone: 'gold' },
  ]
  if (many) {
    rules.push(
      { title: `Packs chain ${short(w.link.out)} → ${short(w.link.in)}`, body: `Each pack's ${w.link.out} → the next pack's ${w.link.in}.${links !== undefined ? ` ${links} short cable${links === 1 ? '' : 's'}.` : ''}`, tone: 'plain' },
      { title: 'Every address different', body: `Pack 1 = ${w.addressing.masterAddress}, then counting up. Set the DIP switches with the packs off.`, tone: 'stop' },
    )
  } else {
    rules.push({ title: `Address ${w.addressing.masterAddress}`, body: 'Set the DIP switch with the pack off.', tone: 'stop' })
  }

  const cables = [
    '1 × ready-made Cat5e/Cat6 patch cable for the inverter run, a few feet longer than the distance. Straight-through, NOT a crossover cable.',
  ]
  if (many) {
    cables.push(
      `${links ?? 'One fewer than the number of packs'}${links !== undefined ? ' ×' : ''} short patch cables (1–2 ft) for the pack-to-pack links. Use the ones in the battery boxes if they reach.`,
    )
  }
  cables.push('1 spare of each, in case a clip is broken.')

  const order = [
    'Everything off: inverter rocker switch off, every pack switched off, battery, PV and AC breakers open.',
    many
      ? 'Set each pack\'s DIP switch from the table. Check the switch body for which end is #1 and which way is ON before you flip anything.'
      : 'Set the pack\'s DIP switch from the table. Check the switch body for which end is #1 and which way is ON.',
  ]
  if (many) {
    order.push(`Link cables: ${w.link.out} on each pack → ${w.link.in} on the next. The first pack's ${w.link.in} and the last pack's ${w.link.out} stay empty.`)
  }
  order.push(
    `Inverter cable: ${many ? 'pack 1\'s ' : ''}${lead} → the inverter's RS485/CAN port.${other ? ` Every ${other} socket stays empty${many ? `, and so does ${lead} on the other packs` : ''}.` : ''}`,
    'Switch the packs on, close the battery breaker, then turn on the inverter rocker switch. PV and AC stay open.',
    'Settings, from the table. Items marked "rocker off" can only be changed with the rocker switch off — do those first.',
    'Run the checks. Close PV, then AC, only once the BMS readings show up.',
  )

  const checks = [...(step('verify').checks ?? [])]
  if (many) {
    checks.push('The inverter\'s SOC roughly agrees with the SOC lights on every pack, not just pack 1. Write down what you see — pack 1 reporting for the whole bank is expected, but not yet confirmed on hardware.')
  }

  // The screen says "the fallback below"; on paper there is no below.
  const faults: FaultCode[] = (step('verify').faults ?? []).map(f => ({
    ...f,
    here: f.here.replace(/the open-loop fallback below/, 'the open-loop fallback on the System step'),
  }))
  if (many) {
    faults.push({
      code: 'ALM',
      name: 'one pack lit red',
      meaning: 'that pack reports a fault of its own',
      here: 'Check its DIP address (no duplicates) and both of its link cables.',
    })
  }

  // Paper is short: print the pin tables for the bus the sheet leads with.
  const pins = (step('comms').pinouts ?? []).filter(
    t => w.preferredBus !== 'rs485' || !/CAN socket/.test(t.title),
  )

  return {
    title: n !== undefined
      ? `${n} × ${battery.model} → ${pair.inverter.model}`
      : `${battery.model} bank → ${pair.inverter.model}`,
    inverterModel: pair.inverter.model,
    batteryModel: battery.model,
    packCount: n,
    rules,
    bank,
    upstreamSocket: lead,
    inverterPorts: SPH_PORTS,
    cables,
    order,
    settings: step('settings').settings ?? [],
    workModes: map.workModes,
    checks,
    faults,
    pins,
    planB: other
      ? `${many ? 'Pack 1\'s' : 'The pack\'s'} ${other} → inverter RS485/CAN port, item 32 = ${otherBus === 'can' ? 'CAN' : '485'}. ` +
        (otherBus === 'can'
          ? 'Pins 4 and 5 match, but the pack puts GND on pin 7, which is RS485-A on the inverter. It will very likely still work; the clean version is a cable with only pins 4 and 5 (the blue pair).'
          : 'Check both pin tables before using it.')
      : undefined,
    monitoring: SPH_MONITORING,
    sources: sourcesFor(battery),
  }
}

/** "RS485B" → "B", so the headline reads like the panel does. */
function short(label: string): string {
  const m = /^RS485([A-Z])$/.exec(label)
  return m ? m[1] : label
}

function sourcesFor(battery: BatteryPreset): string[] {
  return [
    battery.bmsWiring?.source ?? `${battery.model} user manual`,
    'Sun Gold SPH8-10KW User Manual V1.3 §5.2 (LCD settings), §6.1–6.4 (comms ports), §7.1 (fault codes)',
  ]
}
