import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Only same-site paths are allowed as a post-login destination (no open redirects).
const safeNext = next => (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/read/books');

export default function Login() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const next = safeNext(new URLSearchParams(useLocation().search).get('next'));
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={next} replace />;

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const isRegister = mode === 'register';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) await register(form.name.trim(), form.email.trim(), form.password);
      else await login(form.email.trim(), form.password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rd-section rd-narrow">
      <span className="label">{isRegister ? 'Create account' : 'Welcome back'}</span>
      <h1 className="h-l rd-title">{isRegister ? 'Sign up' : 'Log in'}</h1>
      <p className="rd-lead">{isRegister ? 'Create an account to access your reading material.' : 'Log in to access your reading material.'}</p>

      <form className="rd-card rd-form" onSubmit={onSubmit} noValidate>
        {isRegister && (
          <label className="rd-field">
            <span>Full name</span>
            <input value={form.name} onChange={set('name')} autoComplete="name" required minLength={2} maxLength={80} />
          </label>
        )}
        <label className="rd-field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </label>
        <label className="rd-field">
          <span>Password</span>
          <input type="password" value={form.password} onChange={set('password')} autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 8 : 1} />
          {isRegister && <small>At least 8 characters.</small>}
        </label>
        {error && <p className="rd-error" role="alert">{error}</p>}
        <button className="btn btn-lime rd-block" type="submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'} <span className="ar">→</span></button>
        <button type="button" className="rd-link" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}>
          {isRegister ? 'Already have an account? Log in' : 'New here? Create an account'}
        </button>
      </form>
    </section>
  );
}
