import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useEnergyStore } from '../../store/energyStore';
import { Bell, Search, WifiOff, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ color: '#6B7280', fontSize: '0.8rem', fontFamily: 'Space Grotesk, monospace', fontWeight: 500 }}>
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
    </span>
  );
}

export default function TopBar() {
  const { toggleSidebar, notifications, markAllRead, setCommandPaletteOpen } = useUIStore();
  const { mode, systemOnline } = useEnergyStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = notifications.filter(n => !n.read).length;

  return (
    <header style={{
      height: 56, background: '#FFFFFF',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 14, flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Menu toggle */}
      <button
        onClick={toggleSidebar} title="Toggle sidebar"
        style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 6, transition: 'color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
        onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
      >
        <Menu size={18} />
      </button>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', boxShadow: '0 2px 6px rgba(99,102,241,0.3)' }}>
          <img src="/logo.png" alt="OORJA SYNC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.92rem', color: '#111827', letterSpacing: '-0.01em' }}>
          OORJA SYNC
        </span>
      </div>

      {/* Mode badge — subtle, no SIH text */}
      <div style={{ background: mode === 'DEMO' ? '#FEF3C7' : '#ECFDF5', border: `1px solid ${mode === 'DEMO' ? '#FDE68A' : '#A7F3D0'}`, borderRadius: 4, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 600, color: mode === 'DEMO' ? '#92400E' : '#065F46' }}>
        {mode}
      </div>

      <div style={{ flex: 1 }} />

      {/* Campus label */}
      <span style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 400 }}>Smart Campus, Bhopal</span>

      <div style={{ width: 1, height: 20, background: '#E5E7EB' }} />

      {/* System status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {systemOnline ? (
          <>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse-dot 2s infinite' }} />
            <span style={{ color: '#059669', fontSize: '0.73rem', fontWeight: 600 }}>ONLINE</span>
          </>
        ) : (
          <>
            <WifiOff size={12} color="#EF4444" />
            <span style={{ color: '#EF4444', fontSize: '0.73rem', fontWeight: 600 }}>OFFLINE</span>
          </>
        )}
      </div>

      <LiveClock />

      {/* Search */}
      <button
        onClick={() => setCommandPaletteOpen(true)} title="Search (Ctrl+K)"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 12px', color: '#6B7280', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D5DB'; (e.currentTarget as HTMLButtonElement).style.color = '#111827'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
      >
        <Search size={12} />
        <span>Search</span>
        <span style={{ fontSize: '0.63rem', color: '#9CA3AF', marginLeft: 4, background: '#F3F4F6', borderRadius: 3, padding: '1px 4px' }}>Ctrl+K</span>
      </button>

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setNotifOpen(v => !v)} title="Notifications"
          style={{ position: 'relative', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
        >
          <Bell size={17} />
          {unread > 0 && (
            <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700, color: '#fff' }}>
              {unread}
            </div>
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 320, maxHeight: 400, overflowY: 'auto', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
              className="styled-scroll"
            >
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>Notifications</span>
                <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>Mark all read</button>
              </div>
              {notifications.length === 0 && <div style={{ padding: '20px 16px', color: '#9CA3AF', fontSize: '0.8rem', textAlign: 'center' }}>No notifications</div>}
              {notifications.map(n => (
                <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid #F9FAFB', background: n.read ? '#fff' : '#F5F3FF' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: n.type === 'critical' ? '#EF4444' : n.type === 'warning' ? '#F59E0B' : n.type === 'success' ? '#10B981' : '#6366F1' }} />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 2, color: '#111827' }}>{n.title}</div>
                      <div style={{ fontSize: '0.73rem', color: '#6B7280', lineHeight: 1.5 }}>{n.message}</div>
                      <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 4 }}>{new Date(n.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
