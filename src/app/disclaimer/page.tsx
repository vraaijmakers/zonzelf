// DRAFT — written as a reasonable first pass, not by a lawyer. Must be reviewed by
// qualified legal counsel before ZonZelf relies on this to limit liability in production.
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Disclaimer — ZonZelf',
  description: 'What ZonZelf guides and calculators are — and are not. Read this before you build.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  )
}

export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
        <p className="text-sm text-yellow-900">
          Working with batteries, solar panels, and household wiring can start fires, cause
          injury, or damage property if done wrong. Read this page before you act on anything
          from ZonZelf.
        </p>
      </div>

      <h1 className="text-3xl font-bold mb-2">Disclaimer</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: 20 August 2026</p>

      <Section title="Educational starting point, not professional advice">
        <p>
          Everything on ZonZelf — guides, calculators, glossary entries, roadmap, and community
          content — is written to help beginners understand DIY off-grid and hybrid solar
          systems in plain English. It is educational material, not professional engineering,
          electrical, or safety advice, and it is not a substitute for a licensed electrician
          or engineer where your local laws or building codes require one.
        </p>
      </Section>

      <Section title="Calculators are estimates, not guarantees">
        <p>
          The load, battery, panel, and cable (AWG) calculators give you a starting estimate
          based on the numbers you enter and general engineering rules of thumb. They do not
          know your specific equipment, wiring run, climate, or local code requirements. Before
          you buy components or connect anything, verify the results against your equipment
          manufacturer&apos;s specifications and the electrical code that applies where you
          live. ZonZelf gives no warranty, express or implied, that any calculator result is
          accurate, complete, or safe for your specific installation.
        </p>
      </Section>

      <Section title="You are responsible for your own build">
        <p>
          If you design, wire, or install a solar or battery system based on anything you read
          or calculate on ZonZelf, you are doing so at your own risk and are solely responsible
          for the outcome — including verifying local electrical code, permit requirements, and
          manufacturer instructions, and for the safety of the finished installation.
        </p>
        <p>
          To the maximum extent permitted by applicable law, ZonZelf and its operator disclaim
          all liability for any property damage, personal injury, fire, data loss, or other loss
          arising from or related to your use of ZonZelf&apos;s guides, calculators, or
          community content, or from any DIY installation you undertake.
        </p>
      </Section>

      <Section title="Community content isn't verified advice">
        <p>
          Roadmap comments, forum-style discussion, and any other content contributed by other
          users reflect the views of the individual contributor, not ZonZelf. It is not reviewed
          or endorsed by ZonZelf before or after publication unless explicitly labeled otherwise.
        </p>
      </Section>

      <Section title="Live monitoring data">
        <p>
          Monitoring features display data reported by your own inverter or monitoring agent.
          ZonZelf does not control your hardware and cannot guarantee the accuracy, availability,
          or timeliness of monitoring data, and monitoring alerts are not a substitute for
          physical safety equipment (smoke detectors, breakers, fuses) or routine inspection of
          your system.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          See the <Link href="/terms" className="text-yellow-700 hover:underline">Terms of Service</Link> and{' '}
          <Link href="/privacy" className="text-yellow-700 hover:underline">Privacy Policy</Link> for
          the rest of the legal terms covering your use of ZonZelf.
        </p>
      </Section>
    </div>
  )
}
