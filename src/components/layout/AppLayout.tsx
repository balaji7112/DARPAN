import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Bot, X } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useUI } from '../../store/uiStore';
import { useGrid } from '../../store/gridStore';
import type { Alert } from '../../sim/alerts';
import { cx, SeverityBadge } from '../ui/kit';

export function PageSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
    </div>
  );
}

/** Pops a toast for newly raised high / critical alerts. */
function Toasts() {
  const raised = useGrid(s => s.lastRaised);
  const [toasts, setToasts] = useState<Alert[]>([]);
  useEffect(() => {
    const important = raised.filter(a => a.severity === 'high' || a.severity === 'critical');
    if (!important.length) return;
    setToasts(t => [...important, ...t].slice(0, 3));
    const ids = important.map(a => a.id);
    const timer = setTimeout(() => setToasts(t => t.filter(x => !ids.includes(x.id))), 6000);
    return () => clearTimeout(timer);
  }, [raised]);
  return (
    <div className="fixed top-16 right-3 z-40 space-y-2 w-[min(360px,calc(100vw-24px))]" aria-live="polite">
      {toasts.map(a => (
        <div key={a.id} className="card shadow-xl p-3 fade-up border-l-4 border-l-crit">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><SeverityBadge severity={a.severity} /><span className="text-sm font-semibold truncate">{a.title}</span></div>
              <p className="mt-1 text-xs text-muted line-clamp-2">{a.message}</p>
            </div>
            <button onClick={() => setToasts(t => t.filter(x => x.id !== a.id))} className="text-muted hover:text-fg" aria-label="Dismiss"><X size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AppLayout() {
  const collapsed = useUI(s => s.sidebarCollapsed);
  const setCopilot = useUI(s => s.setCopilotOpen);
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className={cx('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-16' : 'lg:pl-60')}>
        <TopBar />
        <main className="flex-1 p-3 sm:p-5 max-w-[1600px] w-full mx-auto">
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Toasts />
      {/* Mobile copilot FAB */}
      <button onClick={() => setCopilot(true)} className="sm:hidden fixed bottom-4 right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-primary text-bg shadow-xl" aria-label="Open AI copilot">
        <Bot size={20} />
      </button>
    </div>
  );
}
