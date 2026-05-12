import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const clamped = Math.min(score, 4);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-500', 'bg-emerald-700'];
  return { score: clamped, label: labels[clamped], color: colors[clamped] };
}

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useProduct();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = getPasswordStrength(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const result = await signup(name, email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/onboarding');
  }

  return (
    <div className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-700">
          Account Setup
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">Create your account</h1>
        <p className="mt-3 text-sm text-stone-600">
          Create your account to start managing WhatsApp message forwarding from the browser.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">Your name</span>
            <input
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">Email</span>
            <input
              type="email"
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Password</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
                        strength.score >= bar ? strength.color : 'bg-stone-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-stone-500">
                  Strength:{' '}
                  <span
                    className={
                      strength.score <= 1
                        ? 'text-rose-500'
                        : strength.score === 2
                          ? 'text-amber-500'
                          : 'text-emerald-700'
                    }
                  >
                    {strength.label}
                  </span>
                  {strength.score < 3 && (
                    <span className="ml-1 text-stone-400">
                      — try adding uppercase, numbers or symbols
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          <button
            disabled={submitting}
            className="w-full rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {submitting ? 'Creating account...' : 'Continue to onboarding'}
          </button>
        </form>

        <p className="mt-6 text-sm text-stone-600">
          Already created an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
