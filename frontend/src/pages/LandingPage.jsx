import { Link, Navigate } from 'react-router-dom';
import { GraduationCap, Users, FolderGit2, CalendarDays } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: Users, title: 'Connect', text: 'Find students with shared skills and interests.' },
  { icon: FolderGit2, title: 'Collaborate', text: 'Publish project ideas and build teams.' },
  { icon: CalendarDays, title: 'Participate', text: 'Discover events, hackathons and opportunities.' },
];

export default function LandingPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <div className="flex items-center gap-2 text-lg font-bold text-indigo-700"><GraduationCap className="h-6 w-6" /> CampusConnect</div>
        <div className="flex gap-3 text-sm font-medium">
          <Link to="/login" className="rounded-lg px-4 py-2 text-slate-700 hover:bg-white">Log in</Link>
          <Link to="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Sign up</Link>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Your campus network, in one place.</h1>
        <p className="mt-4 text-lg text-slate-600">Connect with students, share knowledge, team up on projects and never miss an opportunity.</p>
        <Link to="/register" className="mt-8 inline-block rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700">Get started</Link>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-20 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-6">
            <Icon className="mb-3 h-6 w-6 text-indigo-600" aria-hidden="true" />
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
