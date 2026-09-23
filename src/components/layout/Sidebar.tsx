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

const navItems = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Command Center' },
  { to: '/digital-twin',    icon: Globe,            label: 'Digital Twin' },
  { to: '/solar',           icon: Sun,              label: 'Solar Intelligence' },
  { to: '/battery',         icon: Battery,          label: 'Battery Intelligence' },
  { to: '/consumption',     icon: BarChart3,        label: 'Consumption' },
  { to: '/weather',         icon: Cloud,            label: 'Weather Forecast' },
  { to: '/recommendations', icon: Lightbulb,        label: 'Recommendations' },
  { to: '/early-warning',   icon: ShieldAlert,      label: 'Early Warning' },
  { to: '/iot',             icon: Cpu,              label: 'IoT Devices' },
  { to: '/carbon',          icon: Leaf,             label: 'Carbon' },
  { to: '/cost',            icon: DollarSign,       label: 'Cost' },
  { to: '/reports',         icon: FileText,         label: 'Reports' },
  { to: '/ai-models',       icon: Bot,              label: 'Model Center' },
];

export default function Sidebar() {
  const sidebarOpen = useUIStore(s => s.sidebarOpen);
  const navigate    = useNavigate();
  const { onLogout } = useAuth();

  function handleLogout() {
    onLogout();                           // clears session + updates AuthContext
    navigate('/login', { replace: true }); // replace so Back can't return to dashboard
  }


  return (
    <motion.nav
      animate={{ width: sidebarOpen ? 232 : 60 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        background: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        zIndex: 200,
        overflowX: 'hidden', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}
      className="styled-scroll"
    >
      {/* Brand header */}
      <div style={{
        padding: sidebarOpen ? '16px 16px' : '16px 0',
        display: 'flex', alignItems: 'center',
        gap: 10, justifyContent: sidebarOpen ? 'flex-start' : 'center',
        borderBottom: '1px solid #F3F4F6', flexShrink: 0,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
          <img src="/logo.png" alt="OORJA SYNC" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.88rem', color: '#111827', lineHeight: 1.1 }}>OORJA SYNC</div>
              <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 2 }}>Energy Intelligence</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }} className="styled-scroll">
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
              background: isActive ? '#EEF2FF' : 'transparent',
              color: isActive ? '#4F46E5' : '#6B7280',
              transition: 'all 0.15s',
            })}
            onMouseEnter={e => { if (!(e.currentTarget as HTMLAnchorElement).classList.contains('active')) { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#111827'; } }}
            onMouseLeave={e => {
              const isActive = window.location.pathname === to;
              (e.currentTarget as HTMLElement).style.background = isActive ? '#EEF2FF' : 'transparent';
              (e.currentTarget as HTMLElement).style.color = isActive ? '#4F46E5' : '#6B7280';
            }}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} style={{ flexShrink: 0, color: isActive ? '#4F46E5' : '#6B7280' }} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ fontSize: '0.8rem', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', color: isActive ? '#4F46E5' : '#374151' }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Logout */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid #F3F4F6' }}>
        <button
          onClick={() => handleLogout()}
          title={!sidebarOpen ? 'Sign out' : undefined}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', justifyContent: sidebarOpen ? 'flex-start' : 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            borderRadius: 8, color: '#9CA3AF', fontSize: '0.8rem',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
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
