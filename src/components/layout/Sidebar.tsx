import { NavLink } from 'react-router-dom';
import { X, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useUI } from '../../store/uiStore';
import { useGrid } from '../../store/gridStore';
import { NAV } from './nav';
import Logo from '../ui/Logo';
import { cx } from '../ui/kit';

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const openAlerts = useGrid(s => s.alerts.filter(a => a.status === 'active').length);
  return (
    <nav className="flex-1 overflow-y-auto scroll-thin px-2 py-3 space-y-0.5">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} onClick={onNavigate} title={collapsed ? label : undefined}
          className={({ isActive }) => cx(
            'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            collapsed && 'justify-center px-0',
            isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:bg-surface2 hover:text-fg',
          )}>
          <Icon size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
          {to === '/early-warning' && openAlerts > 0 && (
            <span className={cx('rounded-full bg-crit text-white text-[10px] font-bold px-1.5 min-w-[18px] text-center', collapsed ? 'absolute top-0.5 right-1' : 'ml-auto')}>{openAlerts}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cx('flex items-center gap-2.5 h-14 px-4 border-b border-line shrink-0', collapsed && 'justify-center px-0')}>
      <Logo size={30} />
      {!collapsed && (
        <div className="leading-tight">
          <div className="font-display font-bold tracking-tight">DARPAN</div>
          <div className="text-[10px] text-muted">Smart Grid Platform</div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const collapsed = useUI(s => s.sidebarCollapsed);
  const toggle = useUI(s => s.toggleSidebar);
  const mobileOpen = useUI(s => s.mobileNavOpen);
  const setMobileOpen = useUI(s => s.setMobileNavOpen);

  return (
    <>
      {/* Desktop */}
      <aside className={cx('hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col border-r border-line bg-surface transition-[width] duration-200', collapsed ? 'w-16' : 'w-60')}>
        <Brand collapsed={collapsed} />
        <NavList collapsed={collapsed} />
        <button onClick={toggle} className="m-2 flex items-center justify-center gap-2 rounded-lg py-2 text-xs text-muted hover:bg-surface2 hover:text-fg" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
        </button>
      </aside>

      {/* Mobile drawer */}
      <div className={cx('lg:hidden fixed inset-0 z-50 transition', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none')}>
        <div className={cx('absolute inset-0 bg-black/50 transition-opacity', mobileOpen ? 'opacity-100' : 'opacity-0')} onClick={() => setMobileOpen(false)} />
        <aside className={cx('absolute inset-y-0 left-0 w-64 flex flex-col bg-surface border-r border-line transition-transform duration-200', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
          <div className="relative">
            <Brand collapsed={false} />
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-muted hover:text-fg" aria-label="Close menu"><X size={18} /></button>
          </div>
          <NavList collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </aside>
      </div>
    </>
  );
}
