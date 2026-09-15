import Link from 'next/link'
import { Anchor, Cable, Sun, Waypoints } from 'lucide-react'
import {
  GuideBreadcrumb, GuideDisclaimer, GuideHeader, Note, NextSteps, Tldr, Warn,
} from '@/components/guides/GuideChrome'
import { BOAT_RV_GUIDE_HREF, STEP_TRANSFER } from '@/lib/mobile-scope'

export const metadata = {
  title: 'A Boat Is Not a Small Cabin — ZonZelf Guide',
  description:
    'Every number on this site is derived for a building that stays where you put it. What still transfers to a boat, a van or an RV, what does not, why the cable and grounding steps do not transfer at all, and the two mistakes that cost the most money.',
}

/**
 * THE SCOPE GUIDE. Read this header before editing the page.
 *
 * WHY THIS EXISTS
 * ---------------
 * The seven-step chain never says what it assumes, and what it assumes is a
 * BUILDING: a fixed structure, on land, wired to NEC. A visitor sizing a
 * system for a camper van has no way to discover that half the chain does not
 * apply to them, because every page is written in the same confident voice
 * whether or not the reader is inside its scope. Somebody was always going to
 * take a conductor gauge derived from NEC Table 310.16 and put it in a boat.
 *
 * This page is the stop sign, and it ships BEFORE any mobile support does.
 * That order is deliberate: telling someone the tool does not fit them is
 * cheap, honest, and useful on its own, while building mobile sizing properly
 * is a large piece of work gated on standards we do not yet hold.
 *
 * WHAT THIS PAGE MAY AND MAY NOT CONTAIN
 * --------------------------------------
 * It NAMES the governing standards. It does NOT reproduce them. ABYC E-11,
 * NFPA 1192, ISO 10133/13297 and EN 1648 have not been opened and read, and
 * the admission gate that keeps INVERTER_PRESETS empty applies with more
 * force here, not less: a marine ampacity table transcribed from a forum post
 * would carry this site&apos;s authority into a boat fire.
 *
 * So the line this page holds is:
 *   - Code-derived quantities (ampacity, voltage-drop limits, overcurrent
 *     placement, bonding) are named as DIFFERENT and the standard is cited by
 *     number. No figures.
 *   - Non-code quantities (alternator behaviour, panel mass and area, shade
 *     geometry, battery case sizes) are explained with numbers, because they
 *     are physics and product facts, not code.
 *
 * That line is stated on the page itself, in "What this page will not tell
 * you". Do not quietly cross it later to make the page more useful.
 *
 * THE ALTERNATOR SECTION IS THE MOST VALUABLE THING HERE. It is the one item
 * that is expensive, extremely common, invisible to a beginner, and entirely
 * absent from this site: grep for "alternator" outside this page and
 * src/lib/mobile-scope.ts and you will find nothing. Everything else on this
 * page tells a reader to go elsewhere. This section tells them something.
 */

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-3 mt-10 text-2xl font-bold text-zon-ink scroll-mt-24">
      {children}
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-6 text-lg font-semibold text-zon-ink">{children}</h3>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-zon-body">{children}</p>
}

/** Which standard governs which vehicle, where. Bibliographic only — these are
 *  document identifiers a reader can go and buy, not content we hold. */
const STANDARDS: { what: string; us: string; eu: string }[] = [
  {
    what: 'Boat, DC system',
    us: 'ABYC E-11 (AC & DC Electrical Systems on Boats)',
    eu: 'ISO 10133 (extra-low-voltage DC installations)',
  },
  {
    what: 'Boat, AC system',
    us: 'ABYC E-11, plus USCG 33 CFR 183 Subpart I where petrol is aboard',
    eu: 'ISO 13297 (AC installations)',
  },
  {
    what: 'RV / motorhome / caravan',
    us: 'NFPA 1192, and NEC Article 551',
    eu: 'EN 1648-1 (caravans) / EN 1648-2 (motor caravans); EN 1647 for AC',
  },
  {
    what: 'Fixed building (what this site does)',
    us: 'NEC — Articles 690, 310, 240, 250',
    eu: 'IEC 60364 / national wiring rules',
  },
]

export default function BoatsAndRvsGuide() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <GuideBreadcrumb current="Boats, Vans & RVs" />
      <GuideHeader
        badges={['scope', 'safety', 'beginner']}
        minutes="11 min read"
        title="A Boat Is Not a Small Cabin"
        lede="Every number on this site is derived for a building that stays where you put it. Here is what still transfers to a boat, a van or an RV — and what does not transfer at all."
      />
      <GuideDisclaimer />

      <Tldr>
        <p>
          <strong>The capacity half mostly transfers.</strong> Daily kWh, bank size, and whether
          the array can refill it are arithmetic that does not care what the roof is bolted to.
        </p>
        <p>
          <strong>The protection half does not transfer at all.</strong> Conductor gauge, fuse
          and breaker sizing, and everything this site says about grounding are derived from
          the <strong>NEC</strong>, for a fixed building on land. A boat is governed by ABYC
          E-11; an RV by NFPA 1192. Different tables, different rules, different answers.
        </p>
        <p>
          <strong>Two things a house never faces will cost you real money:</strong> charging a
          lithium bank from the engine alternator without a DC-DC charger, and galvanic
          corrosion through the shore-power ground.
        </p>
        <p>
          We have <strong>not</strong> opened ABYC E-11 or NFPA 1192. This page names them. It
          does not reproduce them, and that is deliberate — see the last section.
        </p>
      </Tldr>

      <P>
        Nothing on this site has ever said out loud what it assumes, so here it is: the seven
        calculator steps assume a <strong>building</strong>. Something with foundations, a fixed
        roof at a fixed angle, an earth electrode in the ground beside it, and wiring that
        answers to the electrical code of the country it sits in. A cabin, a shed, a garage, a
        house.
      </P>
      <P>
        If you are building for a boat, a van, a caravan or an RV, some of that survives the
        move and some of it is actively wrong. The problem is that the site sounds equally sure
        either way, because every page is written in the same voice whether or not you are
        inside its scope. This page is the fix.
      </P>

      <H2 id="which-half">Which half of the site still works</H2>
      <P>
        This site already splits every output into two registers, and the split does almost all
        the work here. <strong>Capacity</strong> outputs are how big — daily kWh, bank size,
        panel count. Get one wrong and you have an undersized system and a disappointing
        December. <strong>Protection</strong> outputs are how safe — conductor gauge,
        overcurrent protection, string voltage against the inverter window. Get one wrong and
        something catches fire.
      </P>
      <P>
        Capacity arithmetic is indifferent to whether it is describing a cabin or a catamaran.
        Protection arithmetic is a direct reading of a specific code table, for a specific
        installation method, in a specific kind of structure. That is why the two halves come
        apart the moment the structure floats.
      </P>

      <div className="my-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zon-rule text-left">
              <th className="py-2 pr-3 font-semibold text-zon-ink">Step</th>
              <th className="py-2 pr-3 font-semibold text-zon-ink">Transfers?</th>
              <th className="py-2 font-semibold text-zon-ink">Why</th>
            </tr>
          </thead>
          <tbody>
            {STEP_TRANSFER.map(row => (
              <tr key={row.step} className="border-b border-zon-rule/60 align-top">
                <td className="py-2 pr-3 text-zon-body">{row.step}</td>
                <td className="py-2 pr-3">
                  <span
                    className={
                      row.verdict === 'No'
                        ? 'font-semibold text-zon-red'
                        : row.verdict === 'Poorly'
                          ? 'font-semibold text-zon-gold-deep'
                          : 'text-zon-body'
                    }
                  >
                    {row.verdict}
                  </span>
                </td>
                <td className="py-2 text-zon-body">{row.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Note>
        <p>
          Read that table as a warning about <em>confidence</em>, not a permission slip. A
          &quot;Mostly&quot; still means check it against your own installation. Nothing here has
          been reviewed by a marine electrician or an RV technician.
        </p>
      </Note>

      <H2 id="code-basis">The code basis is the whole difference</H2>
      <P>
        The cable and protection step cites NEC Table 310.16 by name, and that table describes
        insulated conductors <em>in raceway, cable or earth, at 30 °C ambient</em>. That sentence
        is doing a lot of work, and none of it describes a bilge, an engine bay, or the inside
        of a van roof in August. The same is true of the overcurrent rules, the PV source-circuit
        factors, and every word this site has written about grounding electrodes.
      </P>
      <P>Your installation answers to a different document:</P>

      <div className="my-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zon-rule text-left">
              <th className="py-2 pr-3 font-semibold text-zon-ink">Installation</th>
              <th className="py-2 pr-3 font-semibold text-zon-ink">United States</th>
              <th className="py-2 font-semibold text-zon-ink">Europe</th>
            </tr>
          </thead>
          <tbody>
            {STANDARDS.map(row => (
              <tr key={row.what} className="border-b border-zon-rule/60 align-top">
                <td className="py-2 pr-3 text-zon-body">{row.what}</td>
                <td className="py-2 pr-3 text-zon-body">{row.us}</td>
                <td className="py-2 text-zon-body">{row.eu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <P>
        ABYC standards are voluntary rather than law, which is a distinction beginners
        over-read. They are the recognised standard of care: surveyors survey to them, insurers
        expect them, and a yard will quote them at you. Meanwhile the parts that <em>are</em>{' '}
        law — USCG 33 CFR 183 for petrol-engined boats, including ignition protection — are the
        parts where getting it wrong is an explosion rather than a claim dispute.
      </P>

      <H2 id="cable">1. Your cable rules are not our cable rules</H2>
      <P>
        Three differences matter, and all three point the same way — a marine or vehicle
        installation is treated as a harder environment than a wall cavity, so the rules are
        tighter rather than looser.
      </P>
      <H3>Stranding is mandatory</H3>
      <P>
        ABYC requires stranded copper conductors, with a minimum strand count that rises for
        high-flex locations. The solid-core building wire that a fixed installation takes for
        granted is not permitted, because a hull works and a vehicle vibrates, and solid copper
        work-hardens and cracks at the termination. Tinned conductors are the conventional
        marine choice on top of that, for corrosion rather than code reasons.
      </P>
      <H3>The voltage-drop allowance splits in two</H3>
      <P>
        This site treats 3% voltage drop as a design target, which is what the NEC makes it — an
        informational note, not a requirement. ABYC instead divides circuits into critical and
        non-critical and holds the critical ones to a tighter allowance. A bilge pump that runs
        slow because somebody sized its cable like a bedside lamp is a different category of
        problem from a dim reading light.
      </P>
      <H3>Overcurrent protection sits much closer to the battery</H3>
      <P>
        The fixed-building world has tap rules measured in feet. The marine rule is measured in
        inches from the source of power, with a modest extension if the conductor is sheathed.
        An unfused or distantly fused battery cable in a moving vehicle is the single most
        energetic thing in the build.
      </P>

      <Warn>
        <p>
          None of those three has a number attached in this page, on purpose. We do not hold
          these standards, so we will not print their tables. Take the shape of the rule from
          here and the figures from the standard itself.
        </p>
      </Warn>

      <H2 id="grounding">2. There is no ground rod</H2>
      <P>
        This site has a long guide arguing that an array electrode and a cabin electrode should
        be bonded into <Link href="/guides/one-ground-system" className="text-zon-gold-deep hover:underline">one grounding electrode system</Link>.
        That entire question dissolves when the structure floats or drives. There is no
        electrode. There is no earth.
      </P>
      <P>
        What replaces it is different in kind, not just in detail. A boat has a{' '}
        <strong>bonding system</strong> tying underwater metal together, and the live question
        is what happens when the shore-power cord connects that system, through the dock&apos;s
        safety ground, to every other boat in the marina. Dissimilar metals sitting in seawater
        with a wire between them is a battery, and the thing that corrodes is whichever boat
        drew the short straw. A <strong>galvanic isolator</strong> or an isolation transformer
        is what breaks that path while leaving the safety ground intact for fault current.
      </P>
      <P>
        The neutral-to-ground bond follows the same one-bond logic as the cabin guide and
        arrives at the opposite answer: on shore power the bond is ashore, so the boat must not
        make a second one, and when the inverter or generator becomes the source the bond has to
        transfer to it. An RV is a simpler version of the same idea — no electrode, chassis as
        the bonding path, ground arriving through the shore cord.
      </P>

      <Warn>
        <p>
          Getting this wrong on a boat does not trip a breaker and teach you something. It
          quietly eats the propeller, the shaft and the through-hulls over a season, and the
          failure mode of the AC side is electric shock drowning in the water around the hull.
          This is the section to take to a professional.
        </p>
      </Warn>

      <H2 id="alternator">3. The alternator will not charge lithium safely on its own</H2>
      <P>
        This is the one thing on this page that is not a pointer somewhere else, because it is
        physics and product behaviour rather than code, and because it is the most expensive
        mistake in the whole category. A house has no engine, so nothing on this site has ever
        mentioned it.
      </P>
      <P>
        A standard alternator was designed around lead-acid. As a lead bank fills, its internal
        resistance rises and it stops accepting current, so the alternator tapers off on its own
        and never runs flat out for long. Alternators are rated on that assumption — peak output
        is an intermittent number.
      </P>
      <P>
        LiFePO4 does the opposite. Its internal resistance is very low and its terminal voltage
        stays nearly flat until it is almost full, so it will happily accept everything the
        alternator can produce, for as long as the engine runs. The alternator then operates at
        full output continuously, gets hot, and cooks its stator windings or its diodes.
      </P>
      <P>
        There is a second failure on top of that one. If the battery management system opens the
        circuit while the alternator is working — low temperature, a cell out of balance, any
        protective trip — the alternator suddenly has nowhere to put its output. That is a load
        dump, and the voltage spike takes out the diodes.
      </P>
      <Note>
        <p>
          The fix is a <strong>DC-DC charger</strong> between the start battery and the lithium
          house bank, sized well below the alternator rating, or an external regulator with
          alternator temperature sensing. This is not an upgrade. On a lithium house bank
          charged from an engine it is the part that stops you replacing an alternator.
        </p>
      </Note>
      <P>
        The wider point is that a boat or an RV usually has <strong>three</strong> charge
        sources — solar, engine, and shore power or a generator — where this site models one.
        The panel step asks whether the array alone can refill the bank each day. Aboard, that
        question is often the wrong one, because the engine puts back more in an hour of motoring
        than the roof does all day.
      </P>

      <H2 id="roof">4. The roof is the constraint, not the load</H2>
      <P>
        The panel step runs in one direction: take the daily energy need, divide by peak sun
        hours, get the watts of array required. That works when the answer can be satisfied,
        which on a cabin roof or a patch of ground it usually can.
      </P>
      <P>
        On a vehicle it usually cannot, so the calculation inverts. You do not ask how much array
        the load needs. You measure what is left of the roof after the air conditioner, the
        vents, the fans and the aerial, find the largest panel that physically fits between
        them, and then find out what load that can support. The answer is frequently
        &quot;less than you hoped&quot;, and it is better to learn that before buying a battery.
      </P>
      <P>
        Weight is the second constraint and it is a legal one on an RV: the payload label caps
        what you may add, and panels, battery, inverter and mounting all draw from the same
        allowance. This is most of the reason the batteries guide sends mobile builds to
        LiFePO4 — around 12 kg for 100 Ah against nearly 30 kg for the same amp-hours in AGM.
      </P>
      <P>
        Third, shading behaves differently. A cabin has a tree, which is a fixed problem you can
        design around. A boat has a mast, a boom and rigging throwing a shadow that sweeps the
        array all day while the boat swings at anchor; an RV has a roof unit casting a shadow
        that depends on where you parked. Because a shaded module drags down everything in
        series with it, the usual mobile answer runs against what the array-wiring step
        optimises for: fewer panels per string, more parallel paths, more than one tracker, and
        on a boat a horizontal array in no particular orientation rather than a tilted one
        pointed at the equator.
      </P>
      <Note>
        <p>
          Flexible and semi-flexible panels exist for curved decks and biminis, and they are a
          genuine trade rather than a free win: lower efficiency per square metre, materially
          shorter service life than glass, and — the failure most people meet — serious heat
          build-up when they are bonded straight onto a surface with no air gap behind them.
        </p>
      </Note>

      <H2 id="battery">The battery changes shape, not just chemistry</H2>
      <P>
        The <Link href="/guides/batteries" className="text-zon-gold-deep hover:underline">battery guide</Link>{' '}
        already answers &quot;which chemistry&quot; correctly for mobile use. What it does not
        cover is that almost everything else about the battery changes too:
      </P>
      <ul className="mb-4 ml-5 list-disc space-y-2 text-zon-body">
        <li>
          <strong>Form factor.</strong> The models this site lists are rack and wall-mount units
          built for a plant room. The mobile world runs on drop-in 12 V cases in the standard
          automotive group sizes, because that is what the existing battery box fits.
        </li>
        <li>
          <strong>System voltage.</strong> Our recommendation pushes you up to 24 V or 48 V as
          the system grows. A boat or RV already has a 12 V DC system — lights, pumps, fridge,
          electronics, the engine start bank — and moving the house bank up strands all of it
          unless you plan converters deliberately.
        </li>
        <li>
          <strong>Restraint.</strong> Batteries have to be secured against motion and their
          terminals protected against a dropped spanner. A shelf is not a mounting.
        </li>
        <li>
          <strong>Ventilation.</strong> Flooded lead-acid gassing hydrogen into a sealed
          compartment below deck is a safety question, not an economic one. It changes the
          chemistry decision from preference to requirement.
        </li>
        <li>
          <strong>Ignition protection.</strong> Equipment in a space containing a petrol engine
          or petrol fuel system must be ignition-protected. Plenty of inverters and charge
          controllers are not, and the datasheet will tell you.
        </li>
        <li>
          <strong>Cold.</strong> Low-temperature charge cutoff still matters, and a vehicle
          reaches the temperature the shed warning is about far more easily than a shed does.
        </li>
      </ul>

      <H2 id="not-covered">What this page will not tell you</H2>
      <P>
        It will not give you a marine conductor size, a voltage-drop percentage, a fuse
        distance, or a bonding conductor rating. We have not opened ABYC E-11, NFPA 1192, ISO
        10133 or EN 1648, and this site has a standing rule that it does not publish a
        protection number it has not sourced properly. That rule is why the inverter preset list
        is empty and why panels are only added from a datasheet somebody actually read.
      </P>
      <P>
        Transcribing a marine ampacity table from a forum post would be worse than saying
        nothing, because it would arrive wearing the same confident formatting as the parts of
        this site that are properly sourced. So: the shape of the rules is here, the names of
        the documents are here, and the numbers are in the documents.
      </P>
      <P>
        If mobile support is something you would use, say so through the{' '}
        <Link href="/contact" className="text-zon-gold-deep hover:underline">contact page</Link> —
        it is on the roadmap, and demand is what decides whether it is worth buying the
        standards.
      </P>

      <H2 id="where">Where to go instead, for now</H2>
      <P>
        Use steps 1 to 4 for the energy picture: what you draw in a day, how big a bank that
        implies, and roughly what array would refill it. That much is honest arithmetic and it
        is genuinely useful for setting a budget and a rough shopping list.
      </P>
      <P>
        Then stop, and take the wiring, the protection and the grounding to somebody who works
        to your standard: an ABYC-certified marine electrician for a boat, an RVIA or
        NRVTA-trained technician for an RV, or the equivalent trade body in your country. Bring
        the load and battery numbers with you. Doing the capacity homework first is the part
        that saves you their hourly rate.
      </P>

      <div className="mt-10">
        <NextSteps
          items={[
            {
              href: '/guides/batteries',
              title: 'Battery Types',
              sub: 'Why mobile builds land on LiFePO4',
              Icon: Anchor,
            },
            {
              href: '/guides/choosing-panels',
              title: 'Choosing Panels',
              sub: 'Area, weight and shade — the constraints that bind aboard',
              Icon: Sun,
            },
            {
              href: '/guides/one-ground-system',
              title: 'One Ground System, Not Two',
              sub: 'The fixed-building version of the grounding question',
              Icon: Waypoints,
            },
            {
              href: '/calculators/load',
              title: 'Start at your loads',
              sub: 'The half of the chain that does transfer',
              Icon: Cable,
            },
          ]}
        />
      </div>

      <p className="mt-8 text-xs text-zon-muted">
        Permalink: <code className="font-mono">{BOAT_RV_GUIDE_HREF}</code>
      </p>
    </div>
  )
}
