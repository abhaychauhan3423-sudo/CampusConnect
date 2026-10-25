const styles = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
};

export default function Button({ variant = 'primary', loading = false, className = '', children, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60
        disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}
