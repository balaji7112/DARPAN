import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useAuth } from '../../auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Globe, Sun, Battery, BarChart3,
  Lightbulb, Cloud, ShieldAlert, Cpu, Leaf, DollarSign,
  FileText, Bot, LogOut,
} from 'lucide-react';

// ── Sky-blue sidebar palette ──────────────────────────────────────────────────
const SB_BG        = '#DCEFFA';
const SB_TEXT      = '#1A3A5C';
const SB_MUTED     = '#4A6E8C';
const SB_ACTIVE_BG = '#B5D9F4';
const SB_HOVER_BG  = '#CCE6F7';
const SB_BORDER    = '#B8D8EF';

const navItems = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Command Center' },
  { to: '/digital-twin',    icon: Globe,           label: 'Digital Twin' },
  { to: '/solar',           icon: Sun,             label: 'Solar Intelligence' },
  { to: '/battery',         icon: Battery,         label: 'Battery Intelligence' },
  { to: '/consumption',     icon: BarChart3,       label: 'Consumption' },
  { to: '/weather',         icon: Cloud,           label: 'Weather Forecast' },
  { to: '/recommendations', icon: Lightbulb,       label: 'Recommendations' },
  { to: '/early-warning',   icon: ShieldAlert,     label: 'Early Warning' },
  { to: '/iot',             icon: Cpu,             label: 'IoT Devices' },
  { to: '/carbon',          icon: Leaf,            label: 'Carbon' },
  { to: '/cost',            icon: DollarSign,      label: 'Cost' },
  { to: '/reports',         icon: FileText,        label: 'Reports' },
  { to: '/ai-models',       icon: Bot,             label: 'Model Center' },
];

export default function Sidebar() {
  const sidebarOpen = useUIStore(s => s.sidebarOpen);
  const navigate    = useNavigate();

  // ✅ FIX: use AuthContext.onLogout so React auth state clears, then navigate
  const { onLogout } = useAuth();

  function handleSignOut() {
    onLogout();             // clears localStorage + sets status → 'unauthenticated'
    navigate('/login', { replace: true });
  }

  return (
    <motion.nav
      animate={{ width: sidebarOpen ? 232 : 60 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        background: SB_BG,
        borderRight: `1px solid ${SB_BORDER}`,
        zIndex: 200,
        overflowX: 'hidden', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}
      className="styled-scroll"
    >
      {/* Brand header */}
      <div style={{
        padding: sidebarOpen ? '16px 14px' : '16px 0',
        display: 'flex', alignItems: 'center',
        gap: 10, justifyContent: sidebarOpen ? 'flex-start' : 'center',
        borderBottom: `1px solid ${SB_BORDER}`, flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: '#FFFFFF',
          border: `1px solid ${SB_BORDER}`,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img
            src="/darpan-logo.png"
            alt="DARPAN"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 9 }}
          />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.92rem', color: SB_TEXT, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                DARPAN
              </div>
              <div style={{ fontSize: '0.62rem', color: SB_MUTED, marginTop: 2, fontWeight: 500 }}>Energy Intelligence</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: '8px 6px', overflowY: 'auto' }} className="styled-scroll">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={!sidebarOpen ? label : undefined}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              textDecoration: 'none',
              borderRadius: 8,
              marginBottom: 2,
              background: isActive ? SB_ACTIVE_BG : 'transparent',
              color: isActive ? SB_TEXT : SB_MUTED,
              transition: 'all 0.15s',
            })}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              if (!el.style.background.includes(SB_ACTIVE_BG)) el.style.background = SB_HOVER_BG;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              if (!el.style.background.includes(SB_ACTIVE_BG)) el.style.background = 'transparent';
            }}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} style={{ flexShrink: 0, color: isActive ? SB_TEXT : SB_MUTED }} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ fontSize: '0.8rem', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', color: isActive ? SB_TEXT : SB_MUTED }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && sidebarOpen && (
                  <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#1A6FA8', flexShrink: 0 }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Sign out */}
      <div style={{ padding: '12px 6px', borderTop: `1px solid ${SB_BORDER}` }}>
        <button
          onClick={handleSignOut}
          title={!sidebarOpen ? 'Sign out' : undefined}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', justifyContent: sidebarOpen ? 'flex-start' : 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            borderRadius: 8, color: SB_MUTED, fontSize: '0.8rem',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = '#FAD7D7'; b.style.color = '#B91C1C';
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = 'none'; b.style.color = SB_MUTED;
          }}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.nav>
  );
}
