import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', college: '', course: '', year: '1' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      await register({ ...form, year: Number(form.year) });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      // Show server-side validation messages next to the matching field.
      const map = {};
      (err.response?.data?.errors || []).forEach((x) => { map[x.field] = map[x.field] || x.message; });
      setFieldErrors(map);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <Alert>{error}</Alert>
        <Input label="Full name" name="name" value={form.name} onChange={onChange} error={fieldErrors.name} required />
        <Input label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} error={fieldErrors.email} required />
        <Input label="Password" name="password" type="password" autoComplete="new-password" value={form.password}
          onChange={onChange} error={fieldErrors.password} hint="At least 8 characters, with a letter and a number" required />
        <Input label="College" name="college" value={form.college} onChange={onChange} error={fieldErrors.college} required />
        <div className="grid grid-cols-3 gap-3">
          <Input className="col-span-2" label="Course" name="course" placeholder="B.Tech CSE" value={form.course} onChange={onChange} error={fieldErrors.course} required />
          <Input label="Year" name="year" type="number" min="1" max="6" value={form.year} onChange={onChange} error={fieldErrors.year} required />
        </div>
        <Button type="submit" loading={loading} className="w-full">Sign up</Button>
        <p className="text-center text-sm text-slate-600">Already registered? <Link className="font-medium text-indigo-600 hover:underline" to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
