import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Github, Linkedin, Globe, Trophy, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUser, updateProfile } from '../services/userService';
import { getErrorMessage } from '../services/api';
import Avatar from '../components/common/Avatar';
import Spinner from '../components/common/Spinner';
import Alert from '../components/common/Alert';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const csv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);

function ProfileForm({ user, onSaved, onCancel }) {
  const [f, setF] = useState({
    name: user.name, college: user.college, course: user.course, department: user.department, year: String(user.year),
    bio: user.bio, avatar: user.avatar, github: user.github, linkedin: user.linkedin, portfolio: user.portfolio,
    skills: user.skills.join(', '), interests: user.interests.join(', '), achievements: user.achievements.join('\n'),
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const on = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setErrors({});
    try {
      const updated = await updateProfile({
        ...f, year: Number(f.year), skills: csv(f.skills), interests: csv(f.interests), achievements: lines(f.achievements),
      });
      onSaved(updated);
    } catch (err) {
      setError(getErrorMessage(err));
      const map = {};
      (err.response?.data?.errors || []).forEach((x) => { map[x.field] = map[x.field] || x.message; });
      setErrors(map);
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <Alert>{error}</Alert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" name="name" value={f.name} onChange={on} error={errors.name} required />
        <Input label="College" name="college" value={f.college} onChange={on} error={errors.college} required />
        <Input label="Degree / course" name="course" value={f.course} onChange={on} error={errors.course} required />
        <Input label="Department" name="department" value={f.department} onChange={on} />
        <Input label="Year" name="year" type="number" min="1" max="6" value={f.year} onChange={on} error={errors.year} required />
        <Input label="Avatar image URL" name="avatar" value={f.avatar} onChange={on} error={errors.avatar} placeholder="https://..." />
      </div>
      <Input as="textarea" rows={3} label="Bio" name="bio" value={f.bio} onChange={on} error={errors.bio} hint="Max 500 characters" />
      <Input label="Skills" name="skills" value={f.skills} onChange={on} hint="Comma separated, e.g. React, Node.js, Python" />
      <Input label="Interests" name="interests" value={f.interests} onChange={on} hint="Comma separated" />
      <Input as="textarea" rows={3} label="Achievements" name="achievements" value={f.achievements} onChange={on} hint="One per line" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="GitHub" name="github" value={f.github} onChange={on} error={errors.github} placeholder="https://github.com/you" />
        <Input label="LinkedIn" name="linkedin" value={f.linkedin} onChange={on} error={errors.linkedin} placeholder="https://linkedin.com/in/you" />
        <Input label="Portfolio" name="portfolio" value={f.portfolio} onChange={on} error={errors.portfolio} placeholder="https://..." />
      </div>
      <div className="flex gap-3">
        <Button type="submit" loading={saving}>Save changes</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

const Tags = ({ title, items, color }) => items.length > 0 && (
  <div>
    <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
    <div className="flex flex-wrap gap-2">
      {items.map((i) => <span key={i} className={`rounded-full px-3 py-1 text-xs ${color}`}>{i}</span>)}
    </div>
  </div>
);

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me, setUser } = useAuth();
  const isOwn = !id || id === me._id;
  const [profile, setProfile] = useState(isOwn ? me : null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(!isOwn);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEditing(false); setSaved(false); setError('');
    if (isOwn) { setProfile(me); setLoading(false); return; }
    setLoading(true);
    getUser(id).then(setProfile).catch((e) => setError(getErrorMessage(e))).finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;

  if (editing) {
    return <ProfileForm user={profile} onCancel={() => setEditing(false)}
      onSaved={(u) => { setUser(u); setProfile(u); setEditing(false); setSaved(true); }} />;
  }

  const links = [[Github, profile.github, 'GitHub'], [Linkedin, profile.linkedin, 'LinkedIn'], [Globe, profile.portfolio, 'Portfolio']].filter((l) => l[1]);

  return (
    <div className="space-y-4">
      {saved && <Alert type="success">Profile updated.</Alert>}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar user={profile} size={80} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="text-slate-600">{profile.course}{profile.department && ` · ${profile.department}`} · Year {profile.year}</p>
            <p className="text-sm text-slate-500">{profile.college}</p>
          </div>
          {isOwn ? (
            <Button onClick={() => setEditing(true)}>Edit profile</Button>
          ) : (
            <Button
              onClick={() => navigate(`/messages?userId=${profile._id}`)}
              className="flex items-center gap-1.5"
            >
              <MessageSquare className="h-4 w-4" /> Message
            </Button>
          )}
        </div>
        {profile.bio ? <p className="mt-4 text-slate-700">{profile.bio}</p>
          : isOwn && <p className="mt-4 text-sm text-slate-400">Add a short bio to introduce yourself.</p>}
        {links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {links.map(([Icon, href, label]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline">
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </a>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <Tags title="Skills" items={profile.skills} color="bg-indigo-50 text-indigo-700" />
        <Tags title="Interests" items={profile.interests} color="bg-sky-50 text-sky-700" />
        {profile.achievements.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Achievements</h3>
            <ul className="space-y-1 text-sm text-slate-700">
              {profile.achievements.map((a) => <li key={a} className="flex gap-2"><Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />{a}</li>)}
            </ul>
          </div>
        )}
        {!profile.skills.length && !profile.interests.length && !profile.achievements.length && (
          <p className="text-sm text-slate-400">Nothing added yet.</p>
        )}
      </section>
    </div>
  );
}
