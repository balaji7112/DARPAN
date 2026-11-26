import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Zap, Activity, BatteryCharging, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { DEMO_ACCOUNTS } from '../../auth/authService';
import Logo from '../../components/ui/Logo';

const FEATURES = [
  { icon: Activity, title: 'Live grid telemetry', text: 'Generation, storage, HVAC/HVDC transmission and demand every 3 seconds.' },
  { icon: Zap, title: 'AI/ML forecasting', text: 'Solar and demand forecasts with confidence bands and anomaly detection.' },
  { icon: BatteryCharging, title: 'Hybrid storage dispatch', text: 'Li-ion, sodium-ion, flywheel, pumped hydro and graphite thermal.' },
  { icon: ShieldCheck, title: 'Operator copilot', text: 'Advisory AI that explains grid state and recommends actions.' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-bg">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-line p-10 bg-surface">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgb(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--primary)) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-ok/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Logo size={40} />
          <div>
            <div className="font-display text-xl font-bold tracking-tight">DARPAN</div>
            <div className="text-xs text-muted">Hybrid HVAC–HVDC Smart Grid Platform</div>
          </div>
        </div>
        <div className="relative max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight">
            One unified grid.<br /><span className="text-primary">Balanced in real time.</span>
          </h1>
          <p className="mt-4 text-muted">
            Monitor renewable and conventional generation, hybrid storage and HVAC–HVDC transmission,
            and let AI forecast the duck curve before it arrives.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-line bg-surface2/60 p-4">
                <Icon size={18} className="text-primary" />
                <div className="mt-2 text-sm font-semibold">{title}</div>
                <div className="mt-1 text-xs text-muted leading-relaxed">{text}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-muted">Team DARPAN · OIST Bhopal · SIH26200 · Minor Project</div>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-sm fade-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Logo size={36} />
            <div>
              <div className="font-display text-lg font-bold">DARPAN</div>
              <div className="text-xs text-muted">Smart Grid Management Platform</div>
            </div>
          </div>
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="text-sm text-muted mt-1">Access the grid operations console.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-muted mb-1.5">Email</label>
              <input id="email" type="email" autoComplete="email" className="input" placeholder="operator@darpan.in" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-muted mb-1.5">Password</label>
              <div className="relative">
                <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className="input pr-10" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShow(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg p-1" aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div role="alert" className="rounded-lg border border-crit/30 bg-crit/10 px-3 py-2 text-sm text-crit">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-line bg-surface p-4">
            <div className="label mb-2.5">Demo accounts (click to fill)</div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map(a => (
                <button key={a.email} type="button" onClick={() => { setEmail(a.email); setPassword(a.password); setError(''); }}
                  className="w-full flex items-center justify-between rounded-lg border border-line px-3 py-2 text-left hover:border-primary/50 hover:bg-surface2 transition-colors">
                  <div>
                    <div className="text-sm font-medium">{a.role}</div>
                    <div className="text-xs text-muted font-mono">{a.email} · {a.password}</div>
                  </div>
                  <span className="text-[10px] text-muted">{a.role === 'Admin' ? 'Full access + fault injection' : 'Monitor, ack & resolve'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
