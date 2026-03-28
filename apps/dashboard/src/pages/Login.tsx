import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useProduct();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    navigate('/app');
  }

  return (
    <div className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-700">
          Welcome Back
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">Log in to manage forwarding</h1>
        <p className="mt-3 text-sm text-stone-600">
          Sign in through the new backend auth layer. Session state is now backed by the API, not
          by browser-only mock accounts.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">Password</span>
            <input
              type="password"
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-600"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          <button
            disabled={submitting}
            className="w-full rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-stone-600">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-emerald-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
