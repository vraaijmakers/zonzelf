import Link from 'next/link'
import { Cable, Ruler, Sun, BookOpen } from 'lucide-react'
import {
  GuideBreadcrumb, GuideDisclaimer, GuideHeader, Note, NextSteps, Tldr, Warn,
} from '@/components/guides/GuideChrome'
import { GuideClaims } from '@/components/guides/ClaimStamp'

export const metadata = {
  title: 'One Ground System, Not Two — ZonZelf Guide',
  description:
    'Your array is a hundred feet from the cabin, with earth rods at both ends. Bond them into one grounding electrode system or leave them separate? Why a surge protector at the array makes the bond more urgent, not less, where the SPDs actually go, and why the ground-loop counter-argument inverts its own physics.',
}

/**
 * The question the grounding primer does not answer.
 *
 * /guides/grounding teaches what an electrode is, what bonding means, and why
 * protective earth is not the battery negative. It is deliberately concept
 * level. It never addresses the geometry that every ground-mount builder
 * actually hits: TWO places touching earth, a long DC run between them, and
 * nobody able to say whether the two should be joined.
 *
 * REGISTER. Grounding is PROTECTION under the capacity/protection split in
 * CLAUDE.md, so this page teaches the mechanism and shows where each number is
 * derived from. It cites section numbers and hands the reader the derivation.
 * It never emits a bare "use 6 AWG" — 250.66(A) is presented as the CEILING it
 * actually is, next to the 690.45 path that may ask for something different.
 *
 * THE DIAGRAM DRAWS THE SPD AT THE ARRAY ONLY, deliberately. That is the real
 * DIY build — people protect the thing out in the weather and stop — and it is
 * also the sharper version of the argument. An SPD clamps the PV conductors to
 * ITS OWN ground reference. One at the array, unbonded, therefore delivers the
 * array's ground potential rise to the inverter's input on a plate. The
 * array-only case makes the bond more urgent, not less. An earlier draft drew
 * SPDs at both ends and buried that point.
 *
 * THE GROUND-LOOP SECTION IS LOAD-BEARING. The counter-argument ("a second rod
 * creates a ground loop through my equipment") is everywhere off-grid, and it
 * is not stupid — it correctly identifies the mechanism and then inverts the
 * conclusion. A page that only asserts the code rule loses that reader. The
 * section grants the premise, then shows that removing the bond does not
 * remove the loop, it only removes the copper from it. The genuine
 * objectionable-current rule (250.6) is about a second NEUTRAL-GROUND bond,
 * which is the conflation that keeps the argument alive.
 *
 * SPD PLACEMENT IS ITS OWN QUESTION and got its own section after a reader asked
 * it directly: they had put the SPD at the array "because that made sense". It
 * does make sense, and the fix is not to correct the instinct but to name the
 * rule it is missing -- AN SPD PROTECTS WHAT IS NEXT TO IT. It clamps at its
 * own terminals against its own reference; it does not sanitise the circuit or
 * reach down the wire. Everything else (the 10 m threshold, the 0.5 m rule,
 * coordination, the common ground bar) falls out of that one sentence.
 *
 * THE MANUAL OFTEN SAYS THIS ALREADY. SunGold's requires a Type 2 at BOTH ends
 * and states the inverter has no built-in SPD on either side. Citing the
 * manufacturer beats citing IEC at a reader who owns the manual, so the page
 * does both and leads with the standard.
 *
 * THE FLOATING-ARRAY ARGUMENT is the strongest form of the ground-loop answer
 * and was missing from the first version, which only argued that the loop is
 * worth having. Better: in normal operation IT IS NOT A CLOSED CIRCUIT. The PV
 * conductors float (transformerless inverters require it and monitor it), the
 * SPDs are open until they clamp, and the bonding copper carries nothing. No
 * circuit, no circulating current. The clamp-meter test makes it checkable, and
 * the PV-isolation warning turns a degraded SPD into a named suspect.
 *
 * CODE EDITION DRIFT IS REAL in this corner of the NEC — 690.47 has been
 * renumbered or rewritten in most cycles since 2011, and the array-electrode
 * subsection has been mandatory, absent, permissive and absent again. The page
 * says so rather than pretending one edition is the truth, because the
 * resulting BUILD is identical under every one of them.
 */

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-3 mt-10 text-2xl font-bold text-zon-ink scroll-mt-24">
      {children}
    </h2>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-zon-body">{children}</p>
}

function Derivation({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="my-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zon-muted">{title}</p>
      <div className="overflow-x-auto rounded-lg border border-zon-rule bg-zon-cream px-4 py-3">
        <pre className="font-mono text-sm leading-relaxed text-zon-ink">{children}</pre>
      </div>
      {note && <p className="mt-1 text-xs text-zon-muted">{note}</p>}
    </div>
  )
}

/** Three decreasing bars — the earth-electrode symbol. */
function GroundSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g className="stroke-zon-ink" strokeWidth={2} strokeLinecap="round">
      <line x1={x - 15} y1={y} x2={x + 15} y2={y} />
      <line x1={x - 10} y1={y + 6} x2={x + 10} y2={y + 6} />
      <line x1={x - 5} y1={y + 12} x2={x + 5} y2={y + 12} />
    </g>
  )
}

function Box({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} className="fill-zon-paper stroke-zon-ink" strokeWidth={2} />
      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        textAnchor="middle"
        fontSize={13}
        className="fill-zon-ink"
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  )
}

/**
 * The same build drawn twice. `bonded` is the only difference, and it is the
 * whole point: where the surge current goes when the two ends are joined by
 * copper instead of by dirt.
 *
 * The SPD sits at the ARRAY only — see the file header. It is what most people
 * actually build, and it is the arrangement that makes the unbonded case worst.
 */
function GroundDiagram({ bonded }: { bonded: boolean }) {
  const ARRAY_X = 105
  const INV_X = 695
  const GND_Y = 168

  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule bg-zon-paper p-4">
      <svg
        viewBox="0 0 800 240"
        className="h-auto w-full min-w-[560px]"
        role="img"
        aria-label={
          bonded
            ? 'The array earth rods and the building earth rod joined by a bonding jumper, so both ground references rise together during a surge and the inverter input sees only a small difference'
            : 'The array earth rods and the building earth rod with no bond between them. The surge protector clamps the PV conductors to the array ground reference, so the full ground potential difference appears across the inverter input.'
        }
      >
        <Box x={30} y={22} w={150} h={44} label="ARRAY" />
        <Box x={620} y={22} w={150} h={44} label="INVERTER" />

        <line x1={180} y1={36} x2={620} y2={36} className="stroke-zon-gold-deep" strokeWidth={2.5} />
        <line x1={180} y1={52} x2={620} y2={52} className="stroke-zon-gold-deep" strokeWidth={2.5} />
        <text x={400} y={16} textAnchor="middle" fontSize={11} className="fill-zon-muted">
          PV+ / PV−  ·  100 ft
        </text>

        <line x1={ARRAY_X} y1={66} x2={ARRAY_X} y2={104} className="stroke-zon-ink" strokeWidth={2} />
        <Box x={ARRAY_X - 32} y={104} w={64} h={28} label="SPD" />
        <line x1={ARRAY_X} y1={132} x2={ARRAY_X} y2={GND_Y} className="stroke-zon-ink" strokeWidth={2} />

        <line x1={INV_X} y1={66} x2={INV_X} y2={GND_Y} className="stroke-zon-ink" strokeWidth={2} />
        <text x={INV_X + 12} y={116} fontSize={10} className="fill-zon-muted">
          chassis earth
        </text>

        <GroundSymbol x={ARRAY_X} y={GND_Y} />
        <GroundSymbol x={INV_X} y={GND_Y} />

        <line
          x1={20} y1={196} x2={780} y2={196}
          className="stroke-zon-rule" strokeWidth={2} strokeDasharray="3 5"
        />
        <text x={26} y={210} fontSize={10} className="fill-zon-muted">soil</text>

        {bonded ? (
          <>
            <line
              x1={ARRAY_X} y1={GND_Y + 12} x2={ARRAY_X} y2={222}
              className="stroke-zon-green" strokeWidth={4} strokeLinecap="round"
            />
            <line
              x1={INV_X} y1={GND_Y + 12} x2={INV_X} y2={222}
              className="stroke-zon-green" strokeWidth={4} strokeLinecap="round"
            />
            <line
              x1={ARRAY_X} y1={222} x2={INV_X} y2={222}
              className="stroke-zon-green" strokeWidth={4} strokeLinecap="round"
            />
            <rect x={286} y={210} width={228} height={22} rx={4} className="fill-zon-paper" />
            <text x={400} y={225} textAnchor="middle" fontSize={11} className="fill-zon-green" fontWeight={600}>
              bonding jumper — one system
            </text>
            <text x={400} y={106} textAnchor="middle" fontSize={11} className="fill-zon-green" fontWeight={600}>
              both references rise together — small ΔV at the input
            </text>
          </>
        ) : (
          <>
            <text x={400} y={218} textAnchor="middle" fontSize={11} className="fill-zon-red" fontWeight={600}>
              only soil between them — tens of ohms
            </text>
            <line x1={400} y1={92} x2={400} y2={60} className="stroke-zon-red" strokeWidth={2} />
            <line x1={400} y1={60} x2={394} y2={68} className="stroke-zon-red" strokeWidth={2} />
            <line x1={400} y1={60} x2={406} y2={68} className="stroke-zon-red" strokeWidth={2} />
            <text x={400} y={106} textAnchor="middle" fontSize={11} className="fill-zon-red" fontWeight={600}>
              the whole ΔV lands here — across the inverter input
            </text>
            <text x={148} y={124} fontSize={10} className="fill-zon-red">
              SPD clamps PV to THIS reference
            </text>
          </>
        )}
      </svg>
    </div>
  )
}

function JobsTable() {
  const rows: [string, string, string][] = [
    [
      'Bonding jumper between electrodes',
      'Joins the array rods and the building rod into one grounding electrode system',
      '250.53(C), sized per 250.66',
    ],
    [
      'Equipment grounding conductor',
      'Carries fault current from the array frames back to the system bonding point so a breaker can clear it',
      '690.45, sized per Table 250.122',
    ],
    [
      'Surge return path',
      'Lets the SPD reference and the inverter reference rise together instead of separately',
      'Not a code article — physics',
    ],
  ]
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule">
      <table className="w-full text-sm">
        <caption className="sr-only">
          The three jobs a conductor between the array and the building can be doing
        </caption>
        <thead>
          <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
            <th scope="col" className="px-4 py-2 font-medium">Job</th>
            <th scope="col" className="px-4 py-2 font-medium">What it does</th>
            <th scope="col" className="px-4 py-2 font-medium">Where it is written</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([job, does, where]) => (
            <tr key={job} className="border-b border-zon-rule-soft last:border-0">
              <td className="px-4 py-3 font-medium text-zon-ink">{job}</td>
              <td className="px-4 py-3 text-zon-body">{does}</td>
              <td className="px-4 py-3 font-mono text-xs text-zon-muted">{where}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-zon-rule bg-zon-cream px-4 py-2 text-xs text-zon-muted">
        One piece of copper can do all three — but only if it is routed and sized for all three.
        A conductor that takes its own scenic route to the building is doing the first job and
        not the second.
      </p>
    </div>
  )
}

function PlacementTable() {
  const rows: [string, string, string][] = [
    [
      'At the array',
      'Type 2 DC PV SPD, in an enclosure rated for outdoors',
      'Where the surge gets in. Limits what is handed to the cable.',
    ],
    [
      'At the inverter, within about 0.5 m of the DC terminals',
      'Type 2 DC PV SPD, same voltage rating, usually a DIN-rail unit',
      'Protects the inverter. The array unit is far too distant to do it.',
    ],
    [
      'At the first AC distribution panel',
      'Type 2 AC SPD — a different device, not a spare DC one',
      'Different circuit, different surge path, commonly forgotten.',
    ],
  ]
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule">
      <table className="w-full text-sm">
        <caption className="sr-only">Where surge protective devices go and which type belongs at each place</caption>
        <thead>
          <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
            <th scope="col" className="px-4 py-2 font-medium">Where</th>
            <th scope="col" className="px-4 py-2 font-medium">What</th>
            <th scope="col" className="px-4 py-2 font-medium">Doing what</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([where, what, why]) => (
            <tr key={where} className="border-b border-zon-rule-soft last:border-0">
              <td className="px-4 py-3 font-medium text-zon-ink">{where}</td>
              <td className="px-4 py-3 text-zon-body">{what}</td>
              <td className="px-4 py-3 text-zon-body">{why}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-zon-rule bg-zon-cream px-4 py-2 text-xs text-zon-muted">
        Type 2 at both DC ends is the usual answer. A structure carrying an external lightning
        protection system can push the array end up to Type 1 or Type 1+2 — the end that grows
        is the array, never the inverter.
      </p>
    </div>
  )
}

export default function OneGroundSystemPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <GuideBreadcrumb current="One ground system, not two" />
      <GuideHeader
        badges={['Safety', 'Wiring']}
        minutes="20 min read"
        title="One Ground System, Not Two"
        lede="Your array sits a hundred feet from the cabin. There are earth rods at the array and an earth rod at the building. Do you join them, or keep them separate? Put a surge protector at the array and this stops being a tidiness question — it becomes the difference between a protected inverter and a dead one."
      />
      <GuideDisclaimer />

      <Tldr>
        <p>
          <strong>Join them.</strong> Every electrode on a site gets bonded together into one
          grounding electrode system, and two electrodes that are bonded together count as a
          single system. Do not drive a separate, isolated pin for the inverter and leave the
          two sets of rods connected only through a hundred feet of dirt.
        </p>
        <p>
          <strong>A surge protector at the array makes this more urgent, not less.</strong> An
          SPD clamps the PV conductors to <em>its own</em> ground reference. If that reference
          is not the inverter&apos;s, the SPD does its job perfectly and hands the array&apos;s
          full ground potential rise to the inverter&apos;s input.
        </p>
        <p>
          <strong>And it does not protect the inverter from where it is.</strong> An SPD
          protects what is next to it. Past about 10 m of DC cable you want one at each end —
          your inverter manual may already require it.
        </p>
        <p>
          And separately: the rods at the array do <em>not</em> ground the array. An equipment
          grounding conductor run alongside the PV conductors does that. Earth is never a
          fault-clearing path. Most people who get this wrong got the rods right and the wire
          missing.
        </p>
      </Tldr>

      <H2 id="shape">The shape of the problem</H2>
      <P>
        A ground-mount or pole-mount array stands some distance from the building that holds the
        inverter. Rods went in at the array, because the racking is metal, it is outdoors, and
        driving a rod there felt obviously right. A rod is also at the building, because the AC
        system needs one. So the site now touches earth in two places, with a long DC run
        between them, and the question nobody can answer at the hardware store is whether those
        two places should be joined.
      </P>
      <P>
        The answer is yes, and the reason has very little to do with the reason most people
        expect.
      </P>

      <H2 id="code">Where the answer lives in the code</H2>
      <P>Three sections carry it, and they agree:</P>
      <ul className="mb-4 list-disc space-y-2 pl-5 text-zon-body">
        <li>
          <strong>250.50</strong> — all grounding electrodes present at a building or structure
          are bonded together to form <em>the</em> grounding electrode system. Singular.
        </li>
        <li>
          <strong>250.58</strong> — &ldquo;Two or more grounding electrodes that are bonded
          together shall be considered as a single grounding electrode system.&rdquo; This is
          the sentence that tells you a second rod group is fine, provided it is joined.
        </li>
        <li>
          <strong>690.47</strong> — structures supporting PV use a grounding electrode system
          installed per Article 250, Part III. Part III is where 250.50 lives, so the PV
          article routes you straight back to the general rule rather than granting an
          exception to it.
        </li>
      </ul>
      <P>
        There is one clause that looks like a way out, and it is worth knowing why it is not.
        <strong> 250.54</strong> describes an <em>auxiliary</em> grounding electrode: one you
        connect to the equipment grounding conductors voluntarily. It says such an electrode
        &ldquo;shall not be required to comply with the electrode bonding requirements of 250.50
        or 250.53(C).&rdquo; That is a genuine permission, and it is the source of most of the
        internet arguments on this subject.
      </P>
      <P>
        But read the end of the same sentence: <strong>&ldquo;the earth shall not be used as an
        effective ground-fault current path.&rdquo;</strong> An unbonded auxiliary electrode is
        permitted precisely because it is not doing any safety job — it is decoration with a
        code reference. The moment you are relying on it for anything, it is not auxiliary, and
        the permission does not apply.
      </P>
      <Note>
        <p>
          <strong>Cite your own edition.</strong> This corner of the NEC has moved in most
          cycles since 2011. An array grounding electrode has been mandatory (690.47(D) in the
          2011 and 2014 editions), then deleted outright in 2017, then reinstated as permissive
          in 2020 as 690.47(B), then deleted again in the 2026 edition — which redirects to
          Article 250 Part III rather than restating it. Every one of those editions produces
          the same physical build. The renumbering is noise; the bond is not.
        </p>
      </Note>

      <H2 id="surge">Why two islands is worse than one rod</H2>
      <P>
        This is the part that is not a paperwork argument, and it is the part that decides
        whether your inverter survives a storm season.
      </P>
      <P>
        An SPD has exactly one trick: when the voltage across it rises, it clamps the conductors
        it is protecting to <em>its own</em> ground reference and dumps the surge current there.
        Most people put one at the array, because that is the part standing out in the weather,
        and stop. So the array SPD ties PV+ and PV− to the array rods.
      </P>
      <P>
        Those same two conductors run a hundred feet and terminate on an inverter whose chassis
        is referenced to the building rod. If nothing but soil joins the two rod groups, then
        during a strike they sit at different potentials — and that difference is impressed
        directly across the inverter&apos;s PV input to its own chassis.
      </P>
      <P>
        Put rough numbers on it. A driven rod in ordinary soil is tens of ohms to remote earth,
        and two rod groups a hundred feet apart see something in that range between them. A few
        kiloamps of surge current through tens of ohms is tens of kilovolts. That is not a
        number any inverter&apos;s input insulation is rated to hold off.
      </P>
      <GroundDiagram bonded={false} />
      <P>
        Read that picture carefully, because it contains the whole argument: the SPD is
        <strong> working correctly</strong>. It clamped the PV conductors to a solid earth
        reference exactly as designed. The problem is that it clamped them to the
        <em> wrong one</em> — a reference the inverter does not share. An array-end SPD with no
        bond is not neutral about this. It actively delivers the array&apos;s ground potential
        rise to the inverter on a plate.
      </P>
      <P>
        Bond the two electrode groups with copper and the picture changes completely. The surge
        now has a low-impedance metallic path between the references, so both ends rise
        <em> together</em>. The absolute voltage to remote earth may still be enormous; the
        difference the inverter actually sees across its terminals stays small. That difference
        is the only thing the inverter cares about.
      </P>
      <GroundDiagram bonded />

      <H2 id="ground-loop">&ldquo;But a second rod makes a ground loop&rdquo;</H2>
      <P>
        This is the standard counter-argument. It turns up in every off-grid forum thread and
        video comment section, and it deserves better than being waved away, because the person
        making it has usually noticed something real.
      </P>
      <P>
        The argument runs: two electrodes in different places, a charge gradient across the
        earth between them during a nearby strike, and now current flows from one to the other
        <em> through my equipment</em>. Therefore use one electrode and be done.
      </P>
      <P>
        The first half of that is exactly right. It is the same mechanism as the section above.
        The conclusion is where it inverts.
      </P>
      <P>
        Current flows between two electrodes at different potentials whether or not you approve.
        The only question is what it flows <em>through</em>. Take the bonding conductor away and
        the lowest-impedance metallic path between the array rods and the building rod is the PV
        conductors and the inverter sitting between them. Refusing to bond did not eliminate the
        loop. It removed the copper from the loop and left the equipment in.
      </P>
      <P>
        Add the bond and the loop still exists — but now a deliberate, short, heavy conductor
        sits in parallel with the equipment path, and current divides by impedance. The
        overwhelming majority takes the copper. That is the entire design intent of 250.50.
      </P>
      <Warn>
        <p>
          <strong>&ldquo;One grounding electrode system&rdquo; is not &ldquo;one
          electrode.&rdquo;</strong> The half-remembered rule is that equipment ties into the
          grounding system at a single defined point — true, and it is about where equipment
          connects. It was never a rule that a site may only touch earth in one place.
        </p>
      </Warn>
      <P>
        There <em>is</em> a real objectionable-current rule, and it is worth knowing where it
        actually lives: <strong>250.6</strong>. The parallel path it exists to prevent is
        everyday <em>neutral</em> current finding a return through the grounding conductors, and
        the thing that creates it is a second neutral-to-ground bond — not a second electrode.
        Two different rules, two different problems, one overloaded word. That conflation is the
        reason this argument will not die.
      </P>
      <P>
        A tell for spotting it in the wild: the people making it usually also plan to add an SPD
        out at the array, referenced to a rod there. That is a second electrode. It always was.
      </P>
      <P>
        For a PV array there is a sharper version of the answer, and it dissolves the worry
        rather than merely outweighing it: <strong>in normal operation that loop is not a
        closed circuit at all.</strong>
      </P>
      <P>
        Most transformerless inverters require the array to <em>float</em> — neither PV+ nor
        PV− bonded to earth — and monitor the isolation continuously, faulting if that ever
        changes. Your manual almost certainly says so; SunGold&apos;s says &ldquo;Please do not
        make PV positive or negative ground!&rdquo; twice on the same page. And an SPD is an
        open circuit until it clamps: metal-oxide varistors and a gas discharge tube that
        conduct on overvoltage and do nothing whatsoever the rest of the time.
      </P>
      <P>
        So count the closed circuits in the loop you are worried about. The PV conductors
        float. The SPDs at both ends are open. The inverter&apos;s PV input is galvanically
        isolated. The bonding copper between the electrodes carries nothing. A circulating
        current needs a circuit, and there is not one — the bond is a standby equaliser sitting
        at zero until the day it has work to do.
      </P>
      <Note>
        <p>
          <strong>You can prove this with a clamp meter.</strong> Put a clamp around the
          conductor running between the two electrodes. A healthy system reads essentially
          zero. If it reads real current, you have found a genuine fault — a second
          neutral-to-ground bond, or a ground fault — and that is diagnostic information, not a
          reason to cut the wire.
        </p>
      </Note>
      <Warn>
        <p>
          The corollary: <strong>do not ground PV+ or PV−.</strong> Bonding frames and
          electrodes is not the same act as grounding a current-carrying conductor, and on an
          isolation-monitored inverter the second one is a fault, not a precaution. If you ever
          see a <em>PV isolation</em> alarm, the inverter is telling you something has grounded
          the array — and a degraded SPD is a prime suspect, because varistors fail toward a
          short. Check the SPD status windows before hunting for a pinched cable.
        </p>
      </Warn>

      <H2 id="spd-placement">Where the SPD goes</H2>
      <P>
        Almost everyone puts the surge protector at the array, and the reasoning is sound: that
        is the part standing out in the weather, it is where the surge gets in, so protect it
        there. That instinct is right. It is just not the whole job, and the reason why is the
        single most useful thing to understand about these devices.
      </P>
      <Warn>
        <p>
          <strong>An SPD protects what is next to it.</strong> It clamps at its own terminals,
          against its own ground reference. It does not sanitise the circuit it sits on, and it
          does not reach down the wire. An SPD at the array protects the array and limits what
          gets handed to the cable. It is not protecting an inverter thirty metres away, and it
          was never able to.
        </p>
      </Warn>
      <P>
        Two things defeat it over that distance. The cable between develops its own induced
        surge — at that length it behaves more like an antenna than a wire — and the array SPD
        is referenced to a ground the inverter may not even share, which is the failure this
        whole page is about.
      </P>
      <P>
        So the international PV standards (IEC 60364-7-712, and IEC 61643-32 for the devices
        themselves) put the threshold at roughly <strong>10 m of DC cable</strong>. Under it,
        one SPD covers both ends, because both ends see much the same event. Over it, both ends
        want their own.
      </P>
      <P>
        A hundred feet is thirty metres — three times the threshold. The NEC does not spell
        this out for DC PV circuits, which is exactly why plenty of otherwise careful builds
        fit one SPD and stop. Your inverter manual may well be less coy: SunGold&apos;s says a
        Type 2 SPD &ldquo;should be fitted at the inverter end of the DC cabling <em>and</em>{' '}
        at the array,&rdquo; and notes in the same breath that the inverter &ldquo;is not
        fitted with SPDs in both PV input side and MAINS side.&rdquo; Check yours before
        assuming anything is built in.
      </P>
      <PlacementTable />

      <H2 id="spd-spec">Is it the same device at both ends?</H2>
      <P>
        Mostly, and the part that must match is the part people worry about least.
      </P>
      <P>
        <strong>The voltage rating has to match, because the circuit is the same.</strong> Both
        ends see the same DC voltage, so both need a maximum continuous operating voltage that
        clears your temperature-corrected cold Voc with margin. If the array unit is correctly
        rated, that same rating is correct at the inverter. Size it the way the string guide
        sizes everything else: from cold Voc, not from the nominal number on the panel.
      </P>
      <P>
        <strong>The enclosure usually differs.</strong> The array unit is outdoors and needs the
        weather rating and UV tolerance to go with it. The inverter-end unit is typically a
        DIN-rail device inside the DC disconnect. Same electrical class, different packaging.
      </P>
      <P>
        <strong>The class can differ, but only upward and only at the array.</strong> Type 2 at
        both ends is the normal answer where there is no external lightning protection system.
        Where an LPS is present and separation distances are not maintained, the array end sits
        on a lightning protection zone boundary and may need Type 1 or Type 1+2. The inverter
        end stays Type 2 either way.
      </P>
      <Note>
        <p>
          <strong>Two SPDs on one circuit have to cooperate</strong>, or the downstream one
          takes energy meant for the upstream one. They coordinate through the inductance of
          the cable between them, and about 10 m is enough to do it — which is the same
          threshold, arriving from the other direction. Below that you would be fitting a
          decoupling inductor. On a hundred-foot run the cable does it for free.
        </p>
      </Note>
      <Note>
        <p>
          <strong>Lead length is not a detail.</strong> The voltage developed across any
          conductor during a surge is proportional to how fast the current changes, and a surge
          changes fast. A foot of ground lead with a sharp bend in it can add kilovolts to what
          the protected equipment actually sees, entirely defeating the SPD&apos;s clamping
          voltage. This is why the inverter-end device belongs within about half a metre of the
          DC terminals, and why its ground lead wants to be short and straight rather than
          tidy.
        </p>
      </Note>
      <P>
        One last placement rule, and it is the bridge back to the rest of this page: an SPD has
        to share a ground reference with the equipment it is protecting. Land the inverter-end
        SPD grounds and the inverter chassis ground on a <strong>common ground bar</strong>,
        with one conductor from that bar to the electrode — not on separate journeys that
        happen to end at the same rod. 250.70 rules out stacking conductors under one clamp
        unless it is listed for it, so a bar is the tidy answer as well as the correct one.
      </P>

      <H2 id="egc">The rods do not ground the array</H2>
      <P>
        Separate question, same trench, and the one more likely to hurt a person than a
        component.
      </P>
      <P>
        <strong>250.4(A)(5)</strong> is blunt about it: the earth shall not be considered an
        effective ground-fault current path. If a PV conductor chafes through and energises a
        panel frame, the fault current has to get back to the system bonding point over
        <em> metal</em> in order to be cleared. Soil will not do it — the resistance is orders
        of magnitude too high to operate any protective device, so the frame simply sits there
        energised, waiting.
      </P>
      <P>
        So the array needs an equipment grounding conductor run <strong>with</strong> the PV
        circuit conductors for the full distance — same raceway, same cable, same trench
        (<strong>300.3(B)</strong>) — landed on the bonded frames at one end and on the
        inverter&apos;s grounding point at the other. <strong>690.43</strong> is the article
        that requires the module frames and racking to be bonded in the first place.
      </P>
      <Warn>
        <p>
          The commonest real-world failure on a ground mount is not a missing rod. It is rods at
          the array and no conductor back to the building, installed by someone who believed the
          rods <em>were</em> the array&apos;s ground. Rods give a nearby surge somewhere local to
          go. Wire clears faults. They are not substitutes for one another, and only one of them
          is what makes a breaker trip.
        </p>
      </Warn>

      <H2 id="jobs">What the copper is actually doing</H2>
      <P>
        Once both requirements are on the table, the single conductor running back to the
        building turns out to be wearing three hats:
      </P>
      <JobsTable />
      <P>
        Which matters because it decides the route. A conductor that wanders off on its own path
        to the building is a bonding jumper only. Run it in the trench with the PV pair and it
        can be the equipment grounding conductor too — and the tighter that loop, the better it
        behaves during a surge, because the area enclosed between the conductors is what a
        nearby strike couples into.
      </P>

      <H2 id="sizing">Where the size comes from</H2>
      <P>
        Two different rules govern the same piece of copper, and you install whatever satisfies
        both. Neither of them is a number to copy off a page — including this one.
      </P>
      <Derivation title="As a bonding jumper between electrodes">
{`250.53(C)  →  size the bonding jumper per 250.66
250.66(A)  →  where the conductor's sole connection is to
              rod, pipe or plate electrodes, it is NOT
              REQUIRED TO BE LARGER than 6 AWG copper
              (4 AWG aluminium)`}
      </Derivation>
      <P>
        Read 250.66(A) carefully: it is a <strong>ceiling</strong>, not a recommendation. It
        says the code will not make you go bigger when rods are all you are connecting to. It
        does not say 6 AWG is the right answer for your run, and it stops applying the moment
        the conductor continues on to an electrode type that would demand more.
      </P>
      <Derivation title="As the array equipment grounding conductor">
{`690.45     →  size per Table 250.122, against the rating of
              the overcurrent device protecting the circuit
690.9(B)   →  no overcurrent device in that circuit? use an
              assumed device rated per 690.9(B)
690.45     →  never smaller than 14 AWG
690.45     →  "Increases in equipment grounding conductor
              size to address voltage drop considerations
              shall not be required."`}
      </Derivation>
      <P>
        That last line is the non-obvious one, and it is worth money on a long run. The general
        rule (<strong>250.122(B)</strong>) says that when you upsize the circuit conductors, you
        upsize the equipment grounding conductor proportionally — and on a hundred-foot DC run
        you almost certainly did upsize for voltage drop. 690.45 explicitly switches that
        requirement off for PV circuits. It does <em>not</em> switch off on the AC side of the
        inverter, so do not carry the habit across.
      </P>
      <Note>
        <p>
          Two rules, one conductor, so the larger governs. Work both out against your own
          edition and your own overcurrent device before buying wire — and have the result
          confirmed by whoever inspects the job. The point of showing the derivation rather than
          a number is that your overcurrent device is not ours.
        </p>
      </Note>

      <H2 id="rods">Rods: spacing, count, connections</H2>
      <P>
        <strong>How long.</strong> <strong>250.52(A)(5)</strong> sets rod electrodes at not less
        than 8 ft, driven fully in. A rod that hit caliche at four feet and got bent over is not
        a shorter electrode — it is a decoration.
      </P>
      <P>
        <strong>How many.</strong> <strong>250.53(A)(2)</strong> requires a single rod, pipe or
        plate electrode to be supplemented by an additional electrode unless it is shown to have
        a resistance to earth of 25 ohms or less. Almost nobody measures, so almost everybody
        drives a second rod. That is why pairs are the norm.
      </P>
      <P>
        <strong>How far apart.</strong> <strong>250.53(A)(3)</strong> sets the floor at 6 ft
        (1.8 m). The mechanism behind the number is worth knowing, because the floor is not the
        target: a rod influences a roughly hemispherical volume of soil about as deep as the rod
        is long. Two rods closer together than their own length are working the same dirt, so
        the second one buys far less resistance reduction than you paid for. For 8 ft rods, 8 to
        10 ft of separation is what actually does something. Three rods in a tight triangle
        behave close to one rod with better paperwork.
      </P>
      <P>
        <strong>Connections.</strong> Anything buried is listed for direct burial (UL 467
        acorn-type clamps) or exothermically welded. <strong>250.70</strong> also rules out
        putting more than one conductor under a clamp unless the clamp is listed for it. An
        indoor-rated lug in wet soil is a joint with a countdown on it, and a connection that
        has corroded open still looks perfectly grounded from above.
      </P>
      <P>
        <strong>Not aluminium, down there.</strong> <strong>250.64(A)</strong> bars bare
        aluminium and copper-clad aluminum grounding electrode conductors from direct contact
        with earth or masonry, and bars terminating them within 18 in. of the earth outdoors.
        This is the rule that quietly decides the conductor material for you on a buried run.
      </P>
      <P>
        <strong>Frames.</strong> The anodising on aluminium racking is an electrical insulator —
        that is what anodising is. Bonding hardware listed for the job (lay-in lugs rated for
        aluminium, or bonding washers with teeth designed to bite through the coating) is what
        makes an actual connection. A bolt torqued onto an anodised surface can be mechanically
        perfect and electrically open, and a plain steel screw driven into an aluminium frame
        out in the weather is a dissimilar-metal joint that will corrode besides.
      </P>
      <Note>
        <p>
          <strong>How small a difference matters.</strong> An installer story that makes the
          point better than a calculation: a system with intermittent, unexplained inverter
          faults turned out to have two roof arrays that were never bonded to each other. The
          measured difference between them was <em>one volt</em> — enough to trigger ground
          faults whenever it rained. One bonding jumper and the fault never returned. The
          potentials involved in the storm case are four or five orders of magnitude larger than
          that.
        </p>
      </Note>

      <H2 id="other-bond">The other bond, which is not this one</H2>
      <P>
        Both are called bonding, so they get conflated constantly, and they are entirely
        different questions.
      </P>
      <P>
        Everything above is about <em>electrodes</em> — joining the places where the system
        touches earth. The other one is the <strong>neutral-to-ground bond</strong>: the single
        point where the AC neutral is tied to the grounding system. An off-grid system gets
        exactly one, usually at the first distribution panel, sometimes inside the inverter —
        never both. A second bond puts everyday working neutral current onto the grounding
        conductors, which is both a shock path and a reliable source of nuisance trips. This,
        not a second electrode, is the thing 250.6 is written about.
      </P>
      <P>
        All-in-one inverters vary, and the answer is not always in the marketing copy. Some bond
        internally, some ship with a removable jumper, some have a menu setting that switches
        the bond automatically depending on whether shore power is present, and some do nothing
        at all and expect you to make the bond externally. Confirm it on your unit with a meter,
        not by analogy with someone else&apos;s.
      </P>
      <Note>
        <p>
          A generator is the classic third bond. Most portable sets have a bonded neutral of
          their own, so connecting one to a system that already has its bond gives you two — and
          the fix is a transfer arrangement that switches the neutral, or a genset configured
          floating, not a wire cut on a hunch.
        </p>
      </Note>

      <H2 id="mistakes">What goes wrong</H2>
      <ul className="mb-4 list-disc space-y-2 pl-5 text-zon-body">
        <li>
          Rods at the array, no conductor back to the building, and a builder who believes the
          array is grounded. It is earthed. It is not grounded in the sense that clears a fault.
        </li>
        <li>
          An SPD at the array referenced to rods that are not bonded to the inverter&apos;s —
          surge protection arranged into a surge injector.
        </li>
        <li>
          One SPD at the array and nothing at the inverter on a run three times longer than the
          10 m threshold.
        </li>
        <li>
          A bond that takes its own route to the building rather than the trench with the PV
          conductors, so it is a bonding jumper and the equipment grounding conductor is still
          missing.
        </li>
        <li>Three rods in a two-foot cluster, doing the work of roughly one.</li>
        <li>An indoor-rated lug on a buried rod, or aluminium conductor in the soil.</li>
        <li>
          A bolt torqued hard onto anodised rail and called a bond, with no listed washer to
          bite through the coating.
        </li>
        <li>
          Assuming a plastic combiner enclosure means nothing inside needs bonding. The metal
          parts inside it did not become plastic.
        </li>
        <li>
          Adding a second neutral-to-ground bond on the theory that more ground is better
          ground.
        </li>
        <li>
          Treating rapid shutdown (<strong>690.12</strong>) as though it covered grounding. It
          is a different requirement solving a different problem for a different person — the
          firefighter on your roof.
        </li>
      </ul>

      <Warn>
        <p>
          This page is the mechanism, not your drawing. It explains why one bonded system is the
          answer and where each rule is written, so you can follow the derivation and ask a
          sharper question. The conductor sizes, the electrode arrangement, the number and
          placement of SPDs, and the location of the single neutral-to-ground bond are decisions
          your edition of the code and your inspector make for your specific build — and where a
          hundred-foot run and a lightning season are involved, that conversation is worth
          having before the trench is closed, not after.
        </p>
      </Warn>

      <GuideClaims slug="one-ground-system" />

      <div className="mt-10">
        <NextSteps
          items={[
            {
              href: '/guides/grounding',
              title: 'Earth grounding, in plain English',
              sub: 'The primer — what an electrode and a bond actually are',
              Icon: Sun,
            },
            {
              href: '/guides/wiring',
              title: 'Cable AWG & wiring',
              sub: 'Sizing the conductors this one runs beside',
              Icon: Cable,
            },
            {
              href: '/calculators/awg',
              title: 'Voltage drop & AWG',
              sub: 'What a hundred feet costs you',
              Icon: Ruler,
            },
            {
              href: '/guides/glossary',
              title: 'Glossary',
              sub: 'EGC, GEC, SPD, bonding — which is which',
              Icon: BookOpen,
            },
          ]}
        />
      </div>

      <p className="mt-8 text-xs text-zon-muted">
        Section numbers refer to the US National Electrical Code (NFPA 70); the SPD placement
        threshold comes from IEC 60364-7-712 and IEC 61643-32. Outside the US the principle is
        the same and the article numbers are not — in the Netherlands the governing document is
        NEN 1010. Read the edition your inspector reads, and see our{' '}
        <Link href="/disclaimer" className="text-zon-gold-deep hover:underline">disclaimer</Link>.
      </p>
    </div>
  )
}
