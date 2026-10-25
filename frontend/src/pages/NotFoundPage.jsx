import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl font-bold text-indigo-600">404</p>
      <p className="text-slate-600">We couldn't find that page.</p>
      <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline">Go home</Link>
    </div>
  );
}
