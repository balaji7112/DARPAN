import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useEnergyStore } from '../../store/energyStore';
import {
  LayoutDashboard, Globe, Sun, Battery,
  Lightbulb, AlertTriangle, Cloud, ShieldAlert,
  FileText, Bot, RefreshCw, X, Search,
} from 'lucide-react';

const COMMANDS = [
  { icon: LayoutDashboard, label: 'Command Center',     desc: 'Main energy dashboard',      to: '/dashboard',      group: 'Navigation' },
  { icon: Globe,           label: 'Digital Twin',       desc: 'Interactive campus topology', to: '/digital-twin',   group: 'Navigation' },
  { icon: Sun,             label: 'Solar Intelligence', desc: 'Solar generation & forecast', to: '/solar',          group: 'Navigation' },
  { icon: Battery,         label: 'Battery Intelligence',desc: 'Storage & optimization',    to: '/battery',        group: 'Navigation' },
  { icon: Cloud,           label: 'Weather Forecast',   desc: 'Weather & energy impact',    to: '/weather',        group: 'Navigation' },
  { icon: ShieldAlert,     label: 'Early Warning',      desc: 'Anomaly detection & scenarios',to: '/early-warning', group: 'Navigation' },
  { icon: Lightbulb,       label: 'Recommendations',    desc: 'AI-generated suggestions',   to: '/recommendations',group: 'Navigation' },
  { icon: FileText,        label: 'Reports',            desc: 'Live energy reports',        to: '/reports',        group: 'Navigation' },
  { icon: Bot,             label: 'Model Center',       desc: 'ML models & metrics',        to: '/ai-models',      group: 'Navigation' },
  { icon: RefreshCw,       label: 'Reset Simulation',   desc: 'Clear all injected faults',  action: 'reset',       group: 'Actions' },
];

export default function CommandPalette() {
  const setOpen    = useUIStore(s => s.setCommandPaletteOpen);
  const injectFault = useEnergyStore(s => s.injectFault);
  const navigate   = useNavigate();
  const inputRef   = useRef<HTMLInputElement>(null);
  const [query, setQuery]           = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // Focus the search input immediately
    inputRef.current?.focus();
  }, []);

  const filtered = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    (c.desc || '').toLowerCase().includes(query.toLowerCase())
  );

  // Reset active index when results change
  useEffect(() => { setActiveIndex(0); }, [query]);

  const handleSelect = (cmd: typeof COMMANDS[0]) => {
    if (cmd.to) navigate(cmd.to);
    if (cmd.action === 'reset') injectFault('RESET');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[activeIndex]) handleSelect(filtered[activeIndex]);
    if (e.key === 'Escape') setOpen(false);
  };

  const groups = [...new Set(filtered.map(c => c.group))];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0,
          /* ✅ Light semi-transparent overlay instead of dark */
          background: 'rgba(107,114,128,0.3)',
          backdropFilter: 'blur(4px)',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '18vh',
          padding: '18vh 16px 0',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -8 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-label="Command palette"
          style={{
            width: '100%', maxWidth: 560,
            /* ✅ FIX: fully white background */
            background: '#FFFFFF',
            border: '1px solid #D0D5DD',
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(16,24,40,0.18), 0 8px 16px rgba(16,24,40,0.08)',
          }}
          onKeyDown={handleKeyDown}
        >
          {/* Search input row */}
          <div style={{
            display: 'flex', alignItems: 'center', padding: '14px 16px',
            borderBottom: '1px solid #F2F4F7', gap: 10,
          }}>
            {/* ✅ FIX: visible icon colour */}
            <Search size={17} color="#9CA3AF" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, actions..."
              aria-label="Search commands"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                /* ✅ FIX: explicit dark text */
                color: '#111827', fontSize: '0.95rem',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            />
            {/* ✅ keyboard hint badge */}
            <kbd style={{ background: '#F2F4F7', border: '1px solid #D0D5DD', borderRadius: 5, padding: '2px 7px', fontSize: '0.7rem', color: '#344054', fontFamily: 'inherit' }}>
              Esc
            </kbd>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', padding: 2, borderRadius: 4 }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Results */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }} className="styled-scroll">
            {groups.length === 0 && (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem' }}>
                No results for "<strong style={{ color: '#374151' }}>{query}</strong>"
              </div>
            )}
            {groups.map(group => {
              const items = filtered.filter(c => c.group === group);
              let flatIndex = -1;
              return (
                <div key={group}>
                  {/* Group label */}
                  <div style={{ padding: '10px 18px 4px', fontSize: '0.65rem', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {group}
                  </div>
                  {items.map(cmd => {
                    flatIndex = filtered.indexOf(cmd);
                    const isActive = flatIndex === activeIndex;
                    return (
                      <div
                        key={cmd.label}
                        onClick={() => handleSelect(cmd)}
                        onMouseEnter={() => setActiveIndex(filtered.indexOf(cmd))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 18px', cursor: 'pointer',
                          /* ✅ FIX: visible active / hover state */
                          background: isActive ? '#EEF2FF' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: isActive ? '#E0E7FF' : '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'background 0.1s',
                        }}>
                          <cmd.icon size={14} color={isActive ? '#4F46E5' : '#6B7280'} />
                        </div>
                        <div style={{ flex: 1 }}>
                          {/* ✅ FIX: explicit readable text colours */}
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: isActive ? '#4F46E5' : '#111827' }}>
                            {cmd.label}
                          </div>
                          {cmd.desc && (
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 1 }}>
                              {cmd.desc}
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <kbd style={{ background: '#E0E7FF', border: '1px solid #C7D2FE', borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', color: '#4F46E5' }}>↵</kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer hints */}
          <div style={{ padding: '10px 18px', borderTop: '1px solid #F2F4F7', fontSize: '0.7rem', color: '#9CA3AF', display: 'flex', gap: 16, background: '#FAFAFA' }}>
            <span><kbd style={{ background: '#F2F4F7', border: '1px solid #D0D5DD', borderRadius: 3, padding: '1px 5px', color: '#374151' }}>↑↓</kbd> Navigate</span>
            <span><kbd style={{ background: '#F2F4F7', border: '1px solid #D0D5DD', borderRadius: 3, padding: '1px 5px', color: '#374151' }}>↵</kbd> Select</span>
            <span><kbd style={{ background: '#F2F4F7', border: '1px solid #D0D5DD', borderRadius: 3, padding: '1px 5px', color: '#374151' }}>Esc</kbd> Close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
