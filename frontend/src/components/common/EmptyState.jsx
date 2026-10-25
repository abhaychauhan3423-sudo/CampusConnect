export default function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />}
      <p className="font-medium text-slate-700">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
    </div>
  );
}
