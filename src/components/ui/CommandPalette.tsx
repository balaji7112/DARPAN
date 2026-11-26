import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bot, SunMoon, Eraser, type LucideIcon } from 'lucide-react';
import { useUI } from '../../store/uiStore';
import { useGrid } from '../../store/gridStore';
import { useAuth } from '../../auth/AuthContext';
import { NAV } from '../layout/nav';
import { cx } from './kit';

interface Cmd { label: string; desc: string; icon: LucideIcon; group: string; run: () => void; }

export default function CommandPalette() {
  const setOpen = useUI(s => s.setCommandPaletteOpen);
  const setCopilot = useUI(s => s.setCopilotOpen);
  const toggleTheme = useUI(s => s.toggleTheme);
  const clearFaults = useGrid(s => s.clearFaults);
  const { can } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const cmds = useMemo<Cmd[]>(() => [
    ...NAV.map(n => ({ label: n.label, desc: n.desc, icon: n.icon, group: 'Go to', run: () => navigate(n.to) })),
    { label: 'Ask Copilot', desc: 'Open the AI operator assistant', icon: Bot, group: 'Actions', run: () => setCopilot(true) },
    { label: 'Toggle theme', desc: 'Switch dark / light', icon: SunMoon, group: 'Actions', run: toggleTheme },
    ...(can('inject_faults') ? [{ label: 'Clear all faults', desc: 'End injected fault scenarios', icon: Eraser, group: 'Actions', run: clearFaults }] : []),
  ], [navigate, setCopilot, toggleTheme, clearFaults, can]);

  const list = cmds.filter(c => (c.label + c.desc).toLowerCase().includes(q.toLowerCase()));
  useEffect(() => setIdx(0), [q]);

  const run = (c: Cmd) => { c.run(); setOpen(false); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, list.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && list[idx]) run(list[idx]);
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg card shadow-2xl overflow-hidden fade-up" onClick={e => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={16} className="text-muted" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search pages and actions…" className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted" aria-label="Search commands" />
          <kbd className="rounded bg-surface2 px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto scroll-thin p-2">
          {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No results</li>}
          {list.map((c, i) => {
            const Icon = c.icon;
            return (
              <li key={c.label}>
                {(i === 0 || list[i - 1].group !== c.group) && <div className="px-3 pt-2 pb-1 label">{c.group}</div>}
                <button onMouseEnter={() => setIdx(i)} onClick={() => run(c)} className={cx('w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left', i === idx ? 'bg-primary/10 text-primary' : 'text-fg')}>
                  <Icon size={16} className="shrink-0" />
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className="ml-auto text-xs text-muted truncate">{c.desc}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
