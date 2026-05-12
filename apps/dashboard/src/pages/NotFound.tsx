import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-700">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">Page not found</h1>
        <p className="mt-3 text-sm text-stone-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/"
            className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Go home
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-400"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
