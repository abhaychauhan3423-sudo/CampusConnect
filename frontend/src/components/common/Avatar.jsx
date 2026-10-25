// Shows the profile photo, or colored initials when no photo is set.
export default function Avatar({ user, size = 40 }) {
  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const style = { width: size, height: size, fontSize: size / 2.5 };
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} style={style} className="rounded-full object-cover" />;
  }
  return (
    <div style={style} aria-label={user?.name} className="flex items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
      {initials}
    </div>
  );
}
