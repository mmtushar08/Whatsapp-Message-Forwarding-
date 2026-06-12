import { Link } from 'react-router-dom';

const EFFECTIVE_DATE = 'June 11, 2026';
const CONTACT_EMAIL = 'mmtushar.08@gmail.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold tracking-tight mb-3" style={{ color: '#14201B' }}>{title}</h2>
      <div className="space-y-3 text-[14.5px] leading-relaxed" style={{ color: '#3b4a43' }}>{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#F4F7F4]">
      <header className="px-6 py-5" style={{ background: '#0E3B2E' }}>
        <div className="max-w-[780px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-[19px] text-white tracking-tight no-underline">
            <span className="w-8 h-8 rounded-[9px] grid place-items-center text-white text-sm font-bold" style={{ background: '#1FAB5E' }}>⇶</span>
            Sendro
          </Link>
          <Link to="/" className="text-sm font-semibold text-[#EAF4EE] no-underline hover:underline">← Back to home</Link>
        </div>
      </header>

      <main className="max-w-[780px] mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: '#14201B' }}>Terms of Service</h1>
        <p className="text-sm mb-10" style={{ color: '#5C6B63' }}>Effective date: {EFFECTIVE_DATE}</p>

        <Section title="1. The service">
          <p>
            Sendro forwards messages received by your WhatsApp Business number to destinations you configure
            and provides a team inbox for replying, using Meta's official WhatsApp Business Cloud API. By
            creating an account you agree to these terms and to our{' '}
            <Link to="/privacy" className="font-semibold underline" style={{ color: '#168B4B' }}>Privacy Policy</Link>.
          </p>
        </Section>

        <Section title="2. Your responsibilities">
          <ul className="list-disc pl-5 space-y-2">
            <li>You must own or be authorized to manage the WhatsApp Business Account you connect.</li>
            <li>You must comply with the <a href="https://www.whatsapp.com/legal/business-terms" className="font-semibold underline" style={{ color: '#168B4B' }} target="_blank" rel="noreferrer">WhatsApp Business Terms</a>, Meta's messaging policies (including the 24-hour customer service window and approved-template rules), and all applicable laws — including obtaining any consent required to route customer messages to your configured destinations.</li>
            <li>You are responsible for the destinations you configure (numbers, webhooks, email) and for keeping your account credentials secure.</li>
            <li>You may not use the service for spam, harassment, unlawful content, or to circumvent WhatsApp policies.</li>
          </ul>
        </Section>

        <Section title="3. Plans and limits">
          <p>
            Free and paid plans include usage limits (such as monthly forwarded-message caps, destination counts,
            and log retention). We may suspend forwarding when limits are exceeded. Paid subscriptions renew until
            cancelled; you can cancel at any time from the Billing page.
          </p>
        </Section>

        <Section title="4. Availability and changes">
          <p>
            We aim for high availability but the service is provided "as is" without warranties. Message delivery
            additionally depends on Meta's platform. We may modify or discontinue features with reasonable notice.
          </p>
        </Section>

        <Section title="5. Liability">
          <p>
            To the maximum extent permitted by law, our total liability for any claim related to the service is
            limited to the amount you paid us in the 12 months preceding the claim. We are not liable for indirect
            or consequential damages, or for messages lost due to failures of Meta's platform or your configured destinations.
          </p>
        </Section>

        <Section title="6. Termination">
          <p>
            You may delete your account at any time (see the Privacy Policy for data deletion). We may suspend or
            terminate accounts that violate these terms or WhatsApp policies, with notice where practicable.
          </p>
        </Section>

        <Section title="7. Contact">
          <p>
            Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline" style={{ color: '#168B4B' }}>{CONTACT_EMAIL}</a>
          </p>
        </Section>

        <div className="mt-10 pt-6 text-sm" style={{ borderTop: '1px solid #DCE4DF', color: '#5C6B63' }}>
          See also our <Link to="/privacy" className="font-semibold underline" style={{ color: '#168B4B' }}>Privacy Policy</Link>.
        </div>
      </main>
    </div>
  );
}
