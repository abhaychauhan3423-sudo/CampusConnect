import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function StudentCard({ student }) {
  const navigate = useNavigate();

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3">
          <Link to={`/profile/${student._id}`} className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar user={student} size={48} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900 hover:text-indigo-600 transition">{student.name}</p>
              <p className="truncate text-sm text-slate-500">{student.course} · Year {student.year}</p>
              <p className="truncate text-xs text-slate-400">{student.college}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/messages?userId=${student._id}`);
            }}
            title={`Message ${student.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
        {student.skills?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {student.skills.slice(0, 4).map((s) => (
              <span key={s} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
