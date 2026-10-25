import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';

export default function StudentCard({ student }) {
  return (
    <Link to={`/profile/${student._id}`} className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar user={student} size={48} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{student.name}</p>
          <p className="truncate text-sm text-slate-500">{student.course} · Year {student.year}</p>
          <p className="truncate text-xs text-slate-400">{student.college}</p>
        </div>
      </div>
      {student.skills?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {student.skills.slice(0, 4).map((s) => (
            <span key={s} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{s}</span>
          ))}
        </div>
      )}
    </Link>
  );
}
