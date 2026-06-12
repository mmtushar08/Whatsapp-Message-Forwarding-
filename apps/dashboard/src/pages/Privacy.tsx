import { Link } from 'react-router-dom';

const EFFECTIVE_DATE = 'June 11, 2026';
const CONTACT_EMAIL = 'mmtushar.08@gmail.com';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8">
      <h2 className="text-lg font-bold tracking-tight mb-3" style={{ color: '#14201B' }}>{title}</h2>
      <div className="space-y-3 text-[14.5px] leading-relaxed" style={{ color: '#3b4a43' }}>{children}</div>
    </section>
  );
}

export default function Privacy() {
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
        <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: '#14201B' }}>Privacy Policy</h1>
        <p className="text-sm mb-10" style={{ color: '#5C6B63' }}>Effective date: {EFFECTIVE_DATE}</p>

        <Section id="who-we-are" title="1. Who we are">
          <p>
            Sendro ("we", "us", "our") is a message-forwarding service for WhatsApp Business. It connects a
            customer's WhatsApp Business Account through Meta's official Cloud API and forwards incoming
            messages to destinations the customer configures — another WhatsApp number, a webhook URL, or an
            email address — and provides a team inbox for reading and replying to those messages.
          </p>
          <p>
            This policy explains what data we collect, how we use it, who we share it with, and how you can
            have it deleted. Questions? Contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline" style={{ color: '#168B4B' }}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section id="data-we-collect" title="2. Information we collect">
          <p><strong>Account information.</strong> When you create an account we collect your name, email address, and a password. Passwords are stored only as salted cryptographic hashes — we never store or see your plain-text password.</p>
          <p><strong>WhatsApp Business connection data.</strong> When you connect a WhatsApp Business Account through Meta's embedded signup (or by importing an existing account), we receive and store your WhatsApp Business Account ID (WABA ID), phone number ID, business display name, and an access token issued by Meta. Access tokens are encrypted at rest and are never displayed in full or shared with third parties.</p>
          <p><strong>Message data.</strong> To provide forwarding and the inbox, we process and store incoming messages sent to your connected WhatsApp Business number: the message content, the sender's phone number and profile name, timestamps, and message type. We also store replies you send through the inbox and delivery logs (success/failure status for each forward).</p>
          <p><strong>Configuration data.</strong> Your forwarding destinations (phone numbers, webhook URLs, email addresses), keyword filters, and workspace settings.</p>
          <p><strong>Technical data.</strong> Session tokens used to keep you signed in, and standard server logs (request identifiers, timestamps, and errors) used for security and troubleshooting.</p>
        </Section>

        <Section id="how-we-use" title="3. How we use information">
          <ul className="list-disc pl-5 space-y-2">
            <li>To operate the service: receive messages via Meta's webhooks, apply your filters, forward messages to your configured destinations, and power the team inbox.</li>
            <li>To enforce plan limits, prevent abuse, and secure accounts (rate limiting, session management).</li>
            <li>To troubleshoot delivery failures using message logs.</li>
            <li>To communicate with you about your account or service changes.</li>
          </ul>
          <p>
            We do <strong>not</strong> sell personal data, use message content for advertising, profile message
            senders, or use your data to train machine-learning models.
          </p>
        </Section>

        <Section id="platform-data" title="4. Meta Platform Data">
          <p>
            Data we receive from Meta (including WhatsApp Business Account details, access tokens, and message
            content delivered through the WhatsApp Business Cloud API) is "Platform Data" under the{' '}
            <a href="https://developers.facebook.com/terms/" className="font-semibold underline" style={{ color: '#168B4B' }} target="_blank" rel="noreferrer">Meta Platform Terms</a>.
            We process Platform Data solely to provide the service described in this policy, on the instruction
            of the workspace owner who connected the account. We do not transfer Platform Data to data brokers,
            advertising networks, or any other third party, except to the forwarding destinations the workspace
            owner explicitly configures. We retain Platform Data only as long as needed to provide the service
            (see Section 7) and delete it on request or when the connection is removed.
          </p>
        </Section>

        <Section id="sharing" title="5. When information is shared">
          <p>Message content is shared only with the forwarding destinations that the workspace owner configures:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>WhatsApp numbers</strong> the owner adds as forwarding recipients (delivered via Meta's Cloud API).</li>
            <li><strong>Webhook URLs</strong> the owner provides (delivered as a JSON payload to the owner's own systems).</li>
            <li><strong>Email addresses</strong> the owner provides (delivered via email).</li>
          </ul>
          <p>
            The workspace owner is responsible for ensuring they have the right to route customer messages to
            these destinations. Beyond this, we disclose data only if required by law, or to protect the
            security and integrity of the service.
          </p>
          <p>
            We use Meta's WhatsApp Business Cloud API to receive and send messages; Meta's handling of WhatsApp
            data is governed by Meta's own terms and privacy policies.
          </p>
        </Section>

        <Section id="security" title="6. Data storage and security">
          <ul className="list-disc pl-5 space-y-2">
            <li>WhatsApp access tokens and app secrets are encrypted at rest.</li>
            <li>Passwords are stored as salted hashes and are never recoverable in plain text.</li>
            <li>All traffic to the service is encrypted in transit using TLS (HTTPS) in production.</li>
            <li>Sessions expire automatically and can be revoked by logging out.</li>
            <li>Webhook payloads can be verified with a per-workspace signing secret.</li>
          </ul>
        </Section>

        <Section id="retention" title="7. Data retention">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Account data</strong> is retained while your account is active.</li>
            <li><strong>Message logs and inbox conversations</strong> are retained according to your plan's log-retention period, after which they may be purged.</li>
            <li><strong>Access tokens</strong> are deleted immediately when you disconnect your WhatsApp Business Account or delete your account.</li>
            <li>Backups and server logs are rotated on a fixed schedule.</li>
          </ul>
        </Section>

        <Section id="data-deletion" title="8. Data deletion (how to delete your data)">
          <p>You can have your data deleted at any time:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Disconnect WhatsApp:</strong> In <em>Settings → Meta connection → Disconnect</em>, removing the connection deletes the stored access token.</li>
            <li>
              <strong>Delete your account and all data:</strong> Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}?subject=Account%20deletion%20request`} className="font-semibold underline" style={{ color: '#168B4B' }}>{CONTACT_EMAIL}</a>{' '}
              from your registered email address with the subject "Account deletion request". We will delete your
              account, workspace, stored tokens, message logs, and inbox conversations within <strong>30 days</strong> and
              confirm by email.
            </li>
            <li><strong>Revoke from Meta's side:</strong> You can also revoke Sendro's access at any time in your Meta Business settings; revoked tokens immediately stop working.</li>
          </ul>
        </Section>

        <Section id="your-rights" title="9. Your rights">
          <p>
            Depending on your location, you may have the right to access, correct, export, or delete your
            personal data, and to object to or restrict certain processing. To exercise any of these rights,
            contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline" style={{ color: '#168B4B' }}>{CONTACT_EMAIL}</a>. We respond within 30 days.
          </p>
        </Section>

        <Section id="cookies" title="10. Cookies and local storage">
          <p>
            We use browser local storage to keep you signed in (a session token). We do not use third-party
            advertising or analytics cookies.
          </p>
        </Section>

        <Section id="children" title="11. Children">
          <p>
            Sendro is a business tool and is not directed at children. We do not knowingly collect personal
            data from anyone under 16. If you believe a child has provided us data, contact us and we will delete it.
          </p>
        </Section>

        <Section id="changes" title="12. Changes to this policy">
          <p>
            We may update this policy as the service evolves. Material changes will be announced by email or
            in-app notice before they take effect. The effective date at the top always reflects the latest version.
          </p>
        </Section>

        <Section id="contact" title="13. Contact">
          <p>
            Data controller: Sendro<br />
            Email: <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline" style={{ color: '#168B4B' }}>{CONTACT_EMAIL}</a>
          </p>
        </Section>

        <div className="mt-10 pt-6 text-sm" style={{ borderTop: '1px solid #DCE4DF', color: '#5C6B63' }}>
          See also our <Link to="/terms" className="font-semibold underline" style={{ color: '#168B4B' }}>Terms of Service</Link>.
        </div>
      </main>
    </div>
  );
}
