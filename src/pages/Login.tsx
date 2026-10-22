import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Err } from '../ui';
import { errMsg } from '../api';

export default function Login() {
  const { user, login } = useAuth();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={`/${user.role}/dashboard`} replace />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!u.trim() || !p) return setErr('Username and password are required');
    setBusy(true);
    try { await login(u.trim(), p); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-3">
        <h1 className="text-xl font-bold">📱 Mobile Service Center</h1>
        <Err msg={err} />
        <label className="text-sm block">Username<input className="input" value={u} onChange={(e) => setU(e.target.value)} /></label>
        <label className="text-sm block">Password<input className="input" type="password" value={p} onChange={(e) => setP(e.target.value)} /></label>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
        <p className="text-xs text-slate-500">Demo: admin/admin123 · reception/recep123 · tech/tech123 · customer/cust123</p>
      </form>
    </div>
  );
}
