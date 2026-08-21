import { CheckCircle2, Mail } from 'lucide-react'

export const metadata = {
  title: 'Accessibility Statement — ZonZelf',
  description: 'What ZonZelf has done to be usable by everyone, and what is still in progress.',
}

const IMPLEMENTED = [
  'Every form field is properly associated with its visible label, so screen readers announce what each field is for.',
  'Custom controls (button groups, toggles, disclosure headers) carry the correct ARIA roles, states, and accessible names — not just visual styling.',
  'Icon-only buttons (menu toggle, remove row, scan label, etc.) have accessible names, not just an icon.',
  'A "skip to content" link lets keyboard users jump past the navigation on every page.',
  'Interactive elements are operable by keyboard, not just by mouse or touch.',
  'An automated lint rule (jsx-a11y/label-has-associated-control) runs in CI on every pull request to catch label regressions before they ship.',
  'The accessibility widget (bottom-right of every page) offers adjustable text size, a high-contrast mode, and a reduced-motion mode, each remembered for your next visit.',
]

const IN_PROGRESS = [
  'A full manual audit with a screen reader (VoiceOver/NVDA) across every page.',
  'A systematic color-contrast pass across every component, not just the pages checked so far.',
  'Testing with real assistive-technology users, not just automated tooling.',
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  )
}

export default function AccessibilityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Accessibility Statement</h1>
      <p className="text-sm text-gray-500 mb-6">Last reviewed: 20 August 2026</p>

      <p className="text-gray-700 leading-relaxed">
        ZonZelf aims to meet <strong>WCAG 2.1 level AA</strong> — the widely used standard for
        web accessibility, and the one referenced by the EU&apos;s European Accessibility Act.
        This page is honest about where we actually are: it is a{' '}
        <strong>self-assessment written by the team building the site</strong>, not an
        independent audit or a formal certification. There is no official accessibility
        &quot;certificate&quot; body for a site like this — a certificate implies a paid
        third-party audit we haven&apos;t commissioned. What follows is a plain account of what
        is done, and what isn&apos;t yet.
      </p>

      <Section title="What's implemented today">
        <ul className="space-y-2">
          {IMPLEMENTED.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="What's still in progress">
        <p>We haven&apos;t finished, and we&apos;d rather say so than overclaim:</p>
        <ul className="list-disc pl-6 space-y-1">
          {IN_PROGRESS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title="The accessibility widget">
        <p>
          The icon in the bottom-right corner of every page opens a small panel with three
          controls: text size, high-contrast mode (black text on a white background, underlined
          links, stronger button outlines), and reduced motion (turns off animations and
          transitions). Your choice is saved in your browser and applied automatically on your
          next visit — nothing is sent to our servers or tied to your account.
        </p>
      </Section>

      <Section title="Tell us where we fall short">
        <p className="flex items-start gap-2">
          <Mail className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
          <span>
            If you hit a barrier using ZonZelf with a screen reader, keyboard-only navigation, or
            any other assistive technology, we want to know — reach out via the contact details
            on our GitHub repository. Accessibility bugs are treated as real bugs, not
            nice-to-haves.
          </span>
        </p>
      </Section>
    </div>
  )
}
