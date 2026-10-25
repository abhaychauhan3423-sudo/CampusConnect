import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <Alert>{error}</Alert>
        <Input label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} required />
        <Input label="Password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={onChange} required />
        <Button type="submit" loading={loading} className="w-full">Log in</Button>
        <p className="text-center text-sm text-slate-600">New here? <Link className="font-medium text-indigo-600 hover:underline" to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
