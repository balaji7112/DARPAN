import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, Moon, Sun, Bot, Search, Pause, Play, LogOut, ChevronDown } from 'lucide-react';
import { useUI } from '../../store/uiStore';
import { useGrid, SPEEDS } from '../../store/gridStore';
import { useAuth } from '../../auth/AuthContext';
import { NAV } from './nav';
import { cx } from '../ui/kit';

function SimClock() {
  const simTime = useGrid(s => s.snap.simTime);
  const speedMin = useGrid(s => s.speedMin);
  const running = useGrid(s => s.running);
  const setSpeed = useGrid(s => s.setSpeed);
  const setRunning = useGrid(s => s.setRunning);
  const { can } = useAuth();
  const allowed = can('sim_control');
  const d = new Date(simTime);

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface2/60 pl-2.5 pr-1 py-1">
      <span className={cx('h-1.5 w-1.5 rounded-full', running ? 'bg-ok pulse-dot' : 'bg-warn')} />
      <span className="font-mono text-xs num whitespace-nowrap">
        <span className="hidden sm:inline">{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} </span>
        <b className="text-fg">{d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</b>
      </span>
      <select
        aria-label="Simulation speed" disabled={!allowed} title={allowed ? 'Simulation speed' : 'Admin only'}
        value={speedMin} onChange={e => setSpeed(Number(e.target.value))}
        className="bg-transparent text-xs text-muted border-0 focus:ring-0 cursor-pointer disabled:cursor-default pr-0 hidden sm:block"
      >
        {SPEEDS.map(s => <option key={s.label} value={s.minutes} className="bg-surface text-fg">{s.label}</option>)}
      </select>
      <button onClick={() => setRunning(!running)} disabled={!allowed} title={allowed ? (running ? 'Pause' : 'Resume') : 'Admin only'}
        className="p-1 rounded text-muted hover:text-fg disabled:opacity-40" aria-label={running ? 'Pause simulation' : 'Resume simulation'}>
        {running ? <Pause size={13} /> : <Play size={13} />}
      </button>
    </div>
  );
}

function UserMenu() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  if (!session) return null;
  const initials = session.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface2" aria-haspopup="menu" aria-expanded={open}>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary text-xs font-bold">{initials}</span>
        <span className="hidden md:block text-left leading-tight">
          <span className="block text-xs font-medium">{session.name}</span>
          <span className="block text-[10px] text-muted">{session.role}</span>
        </span>
        <ChevronDown size={14} className="hidden md:block text-muted" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 card shadow-xl p-1.5 z-50 fade-up">
          <div className="px-3 py-2 border-b border-line mb-1">
            <div className="text-sm font-medium">{session.name}</div>
            <div className="text-xs text-muted">{session.email}</div>
            <div className="mt-1 inline-block rounded bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5">{session.role}</div>
          </div>
          <button role="menuitem" onClick={() => { logout(); navigate('/login', { replace: true }); }} className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-crit hover:bg-crit/10">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopBar() {
  const setMobileNavOpen = useUI(s => s.setMobileNavOpen);
  const setPalette = useUI(s => s.setCommandPaletteOpen);
  const setCopilot = useUI(s => s.setCopilotOpen);
  const theme = useUI(s => s.theme);
  const toggleTheme = useUI(s => s.toggleTheme);
  const activeAlerts = useGrid(s => s.alerts.filter(a => a.status === 'active').length);
  const { pathname } = useLocation();
  const title = NAV.find(n => pathname.startsWith(n.to))?.label ?? 'DARPAN';

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 sm:gap-3 border-b border-line bg-surface/85 backdrop-blur px-3 sm:px-5">
      <button onClick={() => setMobileNavOpen(true)} className="lg:hidden p-1.5 rounded-lg text-muted hover:bg-surface2 hover:text-fg" aria-label="Open menu"><Menu size={20} /></button>
      <div className="font-display font-semibold truncate">{title}</div>
      <span className="hidden md:inline-flex items-center rounded-md border border-warn/30 bg-warn/10 px-1.5 py-0.5 text-[10px] font-semibold text-warn">SIMULATED</span>
      <div className="flex-1" />
      <SimClock />
      <button onClick={() => setPalette(true)} className="hidden md:flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted hover:text-fg hover:border-primary/40" aria-label="Search">
        <Search size={14} /> Search <kbd className="rounded bg-surface2 px-1 text-[10px]">⌘K</kbd>
      </button>
      <button onClick={toggleTheme} className="p-2 rounded-lg text-muted hover:bg-surface2 hover:text-fg" aria-label="Toggle theme" title="Toggle theme">
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <Link to="/early-warning" className="relative p-2 rounded-lg text-muted hover:bg-surface2 hover:text-fg" aria-label={`${activeAlerts} active alerts`}>
        <Bell size={17} />
        {activeAlerts > 0 && <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-crit px-1 text-[9px] font-bold text-white">{activeAlerts}</span>}
      </Link>
      <button onClick={() => setCopilot(true)} className="hidden sm:flex btn-primary py-1.5" aria-label="Open AI copilot">
        <Bot size={15} /> <span className="hidden md:inline">Copilot</span>
      </button>
      <UserMenu />
    </header>
  );
}
