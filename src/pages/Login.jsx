import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PhoneField from '../components/PhoneField.jsx';
import { COUNTRIES } from '../lib/countries.js';
import { PHONE_ERROR, isValidPhone } from '../lib/phone.js';

// Only same-site paths are allowed as a post-login destination (no open redirects).
const safeNext = next => (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/read/books');

export default function Login() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const next = safeNext(new URLSearchParams(useLocation().search).get('next'));
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', iso: 'IN', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={next} replace />;

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const isRegister = mode === 'register';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (isRegister && !isValidPhone(form.phone)) { setError(PHONE_ERROR); return; }
    setBusy(true);
    try {
      const dial = COUNTRIES.find(c => c.iso === form.iso)?.dial ?? '';
      if (isRegister) await register(form.name.trim(), form.email.trim(), dial + form.phone, form.password);
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
        {isRegister && (
          <label className="rd-field">
            <span>Phone number</span>
            <PhoneField id="reg-phone" className="ph-row" iso={form.iso} digits={form.phone} onChange={({ iso, digits }) => setForm(f => ({ ...f, iso, phone: digits }))} />
            <small>10 digits, numbers only.</small>
          </label>
        )}
        <label className="rd-field">
          <span>Password</span>
          <span className="rd-pw">
            <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 8 : 1} />
            <button type="button" className="rd-eye" onClick={() => setShowPassword(v => !v)} aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.2A9.9 9.9 0 0112 6c5 0 8.5 4.2 9.5 6-.4.8-1.2 2-2.4 3.1M6.5 7.6C4.4 9 3 11 2.5 12c1 1.8 4.5 6 9.5 6 1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12C3.5 10.2 7 6 12 6s8.5 4.2 9.5 6c-1 1.8-4.5 6-9.5 6s-8.5-4.2-9.5-6z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </span>
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
