import { Link } from 'react-router-dom';

interface Tier {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    tagline: 'Try the product end-to-end.',
    features: [
      '1 forwarding rule',
      '1 destination number',
      '200 messages / month',
      'Message history (last 30 days)',
    ],
    cta: 'Start free',
  },
  {
    name: 'Starter',
    price: '$9',
    period: 'per month',
    tagline: 'Solo founders and freelancers.',
    features: [
      '1 forwarding rule',
      'Unlimited messages',
      'Email forwarding',
      'Keyword filters',
      'Message history (90 days)',
    ],
    cta: 'Start Starter',
  },
  {
    name: 'Pro',
    price: '$19',
    period: 'per month',
    tagline: 'Growing businesses & developers.',
    features: [
      '5 forwarding rules',
      'Multi-destination fan-out',
      'Webhook relay (any URL)',
      'Email forwarding',
      'AI auto-reply (powered by Claude)',
      'Slack relay (coming soon)',
      'Message history (1 year)',
    ],
    cta: 'Start Pro',
    featured: true,
  },
  {
    name: 'Business',
    price: '$39',
    period: 'per month',
    tagline: 'Multi-number & agencies.',
    features: [
      'Unlimited rules',
      'AI auto-reply (powered by Claude)',
      'Time-based routing (coming soon)',
      'Analytics & exports (CSV)',
      'Priority support',
      'Message history (unlimited)',
    ],
    cta: 'Start Business',
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f5efe6,#f6f4ef_45%,#e0f1e9)] px-4 py-12 text-stone-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-700">Pricing</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Simple pricing. Yours forever.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
            Bring your own Meta credentials. No BSP lock-in. <strong>No markup on Meta message rates.</strong>{' '}
            Start free, upgrade when you need more rules or destinations.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/signup"
              className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Create Account
            </Link>
            <Link
              to="/"
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-400"
            >
              Back to home
            </Link>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`relative rounded-[2rem] p-6 shadow-sm transition ${
                tier.featured
                  ? 'border-2 border-emerald-700 bg-white'
                  : 'border border-stone-200/70 bg-white/85 backdrop-blur'
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-6 rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  Most popular
                </div>
              )}
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-700">
                {tier.name}
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-stone-900">{tier.price}</span>
                <span className="text-sm text-stone-500">/ {tier.period}</span>
              </div>
              <p className="mt-2 text-sm text-stone-600">{tier.tagline}</p>

              <ul className="mt-5 space-y-2 text-sm text-stone-700">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-700">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                className={`mt-6 block rounded-full px-5 py-3 text-center text-sm font-semibold transition ${
                  tier.featured
                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                    : 'border border-stone-300 text-stone-900 hover:border-stone-400'
                }`}
              >
                {tier.cta}
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-16 rounded-[2rem] border border-stone-200/70 bg-white/85 p-8 shadow-sm backdrop-blur">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">Frequently asked</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-stone-900">Do you charge a markup on Meta message rates?</h3>
              <p className="mt-2 text-sm text-stone-600">
                No. You bring your own Meta Cloud API credentials, so Meta bills you directly. We never
                touch your message fees.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Do I need a BSP?</h3>
              <p className="mt-2 text-sm text-stone-600">
                No. Meta lets any business register their own Cloud API app for free, with no BSP
                relationship required.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Can I cancel any time?</h3>
              <p className="mt-2 text-sm text-stone-600">
                Yes. Plans are month-to-month with no commitment. Your data stays yours — export at any
                time.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">What if I outgrow Business?</h3>
              <p className="mt-2 text-sm text-stone-600">
                Get in touch for custom pricing — multi-workspace agency plans and on-prem deployments
                are available.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
