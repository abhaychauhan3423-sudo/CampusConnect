import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSuggestions } from '../services/userService';
import Avatar from '../components/common/Avatar';
import StudentCard from '../components/profile/StudentCard';
import Spinner from '../components/common/Spinner';

// Phase 2 dashboard: profile summary + suggested students.
// Posts, events, projects, opportunities and notifications are added in later phases (GET /api/dashboard).
export default function DashboardPage() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState(null);

  useEffect(() => { getSuggestions().then(setSuggestions).catch(() => setSuggestions([])); }, []);

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <Avatar user={user} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">Hi, {user.name.split(' ')[0]}!</h1>
          <p className="truncate text-sm text-slate-500">{user.course} · Year {user.year} · {user.college}</p>
        </div>
        <Link to="/profile" className="text-sm font-medium text-indigo-600 hover:underline">Edit profile</Link>
      </section>
      {!user.skills.length && (
        <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
          Add your skills and interests in <Link className="font-medium underline" to="/profile">your profile</Link> to get better suggestions.
        </p>
      )}
      <section>
        <h2 className="mb-3 font-semibold">Suggested students</h2>
        {suggestions === null ? <Spinner /> : suggestions.length === 0 ? (
          <p className="text-sm text-slate-500">No other students have joined yet. Invite your classmates!</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">{suggestions.map((s) => <StudentCard key={s._id} student={s} />)}</div>
        )}
      </section>
    </div>
  );
}
