import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { searchUsers, getSuggestions } from '../services/userService';
import { getErrorMessage } from '../services/api';
import StudentCard from '../components/profile/StudentCard';
import Spinner from '../components/common/Spinner';
import Alert from '../components/common/Alert';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';

export default function StudentsPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [students, setStudents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New search term -> reset to page 1.
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setPage(1);
    searchUsers({ q, page: 1 })
      .then((d) => { if (!cancelled) { setStudents(d.users); setPages(d.pages); } })
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [q]);

  useEffect(() => { getSuggestions().then(setSuggestions).catch(() => {}); }, []);

  const loadMore = async () => {
    try {
      const d = await searchUsers({ q, page: page + 1 });
      setStudents((s) => [...s, ...d.users]);
      setPage(page + 1);
    } catch (e) { setError(getErrorMessage(e)); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{q ? `Results for "${q}"` : 'Discover students'}</h1>
      <Alert>{error}</Alert>
      {loading ? <Spinner /> : students.length === 0 ? (
        <>
          <EmptyState icon={SearchX} title="No students found" text="Try a different name, college or skill (e.g. React, Python)." />
          {suggestions.length > 0 && (
            <>
              <h2 className="font-semibold">Suggested for you</h2>
              <div className="grid gap-3 sm:grid-cols-2">{suggestions.map((s) => <StudentCard key={s._id} student={s} />)}</div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">{students.map((s) => <StudentCard key={s._id} student={s} />)}</div>
          {page < pages && <div className="text-center"><Button variant="secondary" onClick={loadMore}>Load more</Button></div>}
        </>
      )}
    </div>
  );
}
