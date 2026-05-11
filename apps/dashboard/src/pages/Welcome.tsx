import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f5efe6,#f6f4ef_45%,#e0f1e9)] px-4 py-12 text-stone-900">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-stone-200/70 bg-white/85 p-8 shadow-[0_30px_100px_rgba(36,32,25,0.08)] backdrop-blur">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-700">
              WhatsApp Forwarder
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-none tracking-tight">
              Sell WhatsApp message forwarding as a web-managed service.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-stone-600">
              Users create an account, connect their WhatsApp Cloud API details, choose where
              messages should be forwarded, and manage everything from the browser.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Create Account
              </Link>
              <Link
                to="/pricing"
                className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-400"
              >
                See pricing
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-400"
              >
                Log In
              </Link>
            </div>
          </section>

          <section className="grid gap-4">
            {[
              'Create account and workspace',
              'Connect WhatsApp Cloud API details',
              'Choose the forwarding destination number',
              'Set optional keyword filters and review logs',
            ].map((step, index) => (
              <article
                key={step}
                className="rounded-[1.75rem] border border-stone-200/70 bg-white/80 p-6 shadow-[0_18px_60px_rgba(36,32,25,0.08)]"
              >
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-stone-500">
                  Step {index + 1}
                </p>
                <h2 className="mt-3 text-xl font-semibold">{step}</h2>
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
