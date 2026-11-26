import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useEnergyStore } from '../../store/energyStore';
import GlassCard from '../../components/ui/GlassCard';
import KPICard from '../../components/ui/KPICard';
import { Globe, Cpu, BarChart2, Sun, Wind, Battery, Zap, Factory, School, BookOpen, UtensilsCrossed, Home, Network } from 'lucide-react';

// ── Asset types ──────────────────────────────────────────────────────
type Preset = 'AERIAL' | 'SOLAR' | 'BATTERY' | 'BUILDING' | 'WIND' | 'ENERGY_NETWORK';
const presets: Preset[] = ['AERIAL', 'SOLAR', 'BATTERY', 'BUILDING', 'WIND', 'ENERGY_NETWORK'];

// ── Lucide icon map (replaces emojis) ───────────────────────────────
const ASSET_ICONS: Record<string, React.ReactNode> = {
  solar:    <Sun       size={18} strokeWidth={1.5} />,
  wind:     <Wind      size={18} strokeWidth={1.5} />,
  battery:  <Battery   size={18} strokeWidth={1.5} />,
  grid:     <Factory   size={18} strokeWidth={1.5} />,
  academic: <School    size={18} strokeWidth={1.5} />,
  hostel:   <Home      size={18} strokeWidth={1.5} />,
  canteen:  <UtensilsCrossed size={18} strokeWidth={1.5} />,
  library:  <BookOpen  size={18} strokeWidth={1.5} />,
};

const ASSET_INFO: Record<string, { label: string; desc: string; color: string }> = {
  solar:   { label: 'Solar Farm',      desc: '640 bifacial panels · 180 kWp peak · MPPT inverters', color: 'var(--color-solar)' },
  wind:    { label: 'Wind Turbines',   desc: '3 × 25 kW micro-turbines · hub height 30m',            color: 'var(--color-grid)' },
  battery: { label: 'Battery Bank',    desc: '400 kWh LiFePO₄ · 4C discharge · BMS protected',      color: 'var(--color-success)' },
  grid:    { label: 'Grid Connection', desc: '3-phase 11 kV connection · bidirectional metering',    color: 'var(--color-secondary)' },
  academic:{ label: 'Academic Block',  desc: 'Classrooms, labs, faculty offices · 40 kW peak',       color: 'var(--color-primary)' },
  hostel:  { label: 'Hostel Block',    desc: 'Residential block · 24hr load · 22 kW avg',            color: 'var(--color-primary)' },
  canteen: { label: 'Canteen',         desc: 'Kitchen + seating · 15 kW · solar water heating',     color: 'var(--color-success)' },
  library: { label: 'Library',         desc: 'AC + lighting · smart occupancy sensors · 12 kW',     color: 'var(--color-primary)' },
};

// ── Campus Schematic (replaces 3D canvas) ────────────────────────────
function CampusSchematic({ selected, onSelect, preset }: {
  selected: string | null;
  onSelect: (id: string) => void;
  preset: Preset;
}) {
  const { solar, battery, windPower, totalLoad, gridDependency, energyState } = useEnergyStore();

  // ── Node — uses ASSET_ICONS instead of emoji string ─────────────────
  const AssetNode = ({ id, x, y, label, value, unit, color, size = 80 }: {
    id: string; x: number; y: number; label: string;
    value: string; unit: string; color: string; size?: number;
  }) => {
    const isSelected = selected === id;
    return (
      <motion.div
        onClick={() => onSelect(id)}
        whileHover={{ scale: 1.06, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.97 }}
        style={{
          position: 'absolute', left: `${x}%`, top: `${y}%`,
          transform: 'translate(-50%,-50%)',
          width: size, height: size,
          background: isSelected ? `${color}12` : '#FFFFFF',
          border: `${isSelected ? 2 : 1}px solid ${isSelected ? color : '#E4E7EC'}`,
          borderRadius: 14, cursor: 'pointer', zIndex: 5,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: isSelected ? `0 4px 20px ${color}22` : '0 1px 4px rgba(16,24,40,0.08)',
          padding: 8,
          transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
        }}
      >
        {/* ✅ Lucide outline icon, no emoji */}
        <div style={{ color, lineHeight: 1, marginBottom: 3 }}>
          {ASSET_ICONS[id] ?? <Zap size={18} strokeWidth={1.5} />}
        </div>
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.85rem', color }}>
          {value}<span style={{ fontSize: '0.6rem', color: '#9CA3AF', marginLeft: 1 }}>{unit}</span>
        </div>
        <div style={{ fontSize: '0.58rem', color: '#6B7280', textAlign: 'center', lineHeight: 1.2, marginTop: 2 }}>{label}</div>
      </motion.div>
    );
  };

  const stateColor: Record<string, string> = {
    SURPLUS: '#166534', BALANCED: '#2563EB',
    DEFICIT: '#D97706', CRITICAL: '#DC2626',
    NORMAL: '#166534',  FAULT: '#DC2626',
  };
  const sc = stateColor[energyState] || '#2563EB';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 380 }}>
      {/* State */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ background: `${sc}12`, border: `1px solid ${sc}30`, borderRadius: 20, padding: '3px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc, animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, color: sc, fontSize: '0.75rem' }}>{energyState}</span>
        </div>
        <span style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 600 }}>View: {preset.replace('_', ' ')}</span>
      </div>

      {/* SVG connection lines — professional palette */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
        {[
          { x1: '20%', y1: '22%', x2: '50%', y2: '48%', color: '#D97706', active: solar.currentPower > 1 },
          { x1: '80%', y1: '22%', x2: '50%', y2: '48%', color: '#2563EB', active: windPower > 0.3 },
          { x1: '50%', y1: '52%', x2: '20%', y2: '76%', color: '#2563EB', active: true },
          { x1: '50%', y1: '52%', x2: '80%', y2: '76%', color: '#64748B', active: gridDependency > 5 },
          { x1: '50%', y1: '52%', x2: '35%', y2: '88%', color: '#1E3A5F', active: totalLoad > 0 },
          { x1: '50%', y1: '52%', x2: '65%', y2: '88%', color: '#166534', active: totalLoad > 0 },
        ].map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={l.active ? l.color : '#D1D5DB'}
            strokeWidth={l.active ? 1.5 : 1}
            strokeDasharray={l.active ? '5 4' : '3 5'}
            opacity={l.active ? 0.65 : 0.4}
          />
        ))}
      </svg>

      {/* Nodes — no emoji props */}
      <AssetNode id="solar"    x={20} y={22} label="Solar Farm" value={solar.currentPower.toFixed(1)} unit="kW" color="#D97706" />
      <AssetNode id="wind"     x={80} y={22} label="Wind"       value={windPower.toFixed(1)}           unit="kW" color="#2563EB" />
      <AssetNode id="hub"      x={50} y={50} label="Energy Hub" value={(solar.currentPower + windPower).toFixed(1)} unit="kW" color="#2563EB" size={90} />
      <AssetNode id="battery"  x={20} y={76} label="Battery"    value={battery.soc.toFixed(0)}         unit="%" color="#166534" />
      <AssetNode id="grid"     x={80} y={76} label="Grid"       value={gridDependency.toFixed(0)}      unit="%" color="#64748B" />
      <AssetNode id="academic" x={35} y={90} label="Academic"   value={(totalLoad * 0.45).toFixed(1)}  unit="kW" color="#1E3A5F" size={72} />
      <AssetNode id="hostel"   x={65} y={90} label="Hostel"     value={(totalLoad * 0.3).toFixed(1)}   unit="kW" color="#1E3A5F" size={72} />

      <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: '0.6rem', color: '#6B7280', zIndex: 10 }}>
        Campus Topology · Bhopal, India · Click nodes to inspect · All values SIMULATED
      </div>
    </div>
  );
}

// ── Asset detail panel ────────────────────────────────────────────────
function AssetDetail({ id }: { id: string }) {
  const info = ASSET_INFO[id];
  if (!info) return null;
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      style={{ padding: '10px 0' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {/* ✅ Lucide icon replaces emoji */}
        <div style={{ color: info.color }}>
          {ASSET_ICONS[id] ?? <Zap size={22} strokeWidth={1.5} />}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827' }}>{info.label}</div>
          <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>{info.desc}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────
export default function DigitalTwinPage() {
  const { solar, battery, totalLoad, windPower, buildings } = useEnergyStore();
  const [selectedPreset, setSelectedPreset] = useState<Preset>('AERIAL');
  const [selectedAsset, setSelectedAsset]   = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 88px)' }}>
      {/* Preset buttons — light theme */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button key={p} onClick={() => setSelectedPreset(p)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              background: selectedPreset === p ? '#EFF6FF' : '#FFFFFF',
              border: `1px solid ${selectedPreset === p ? '#BFDBFE' : '#E4E7EC'}`,
              color: selectedPreset === p ? '#1E3A5F' : '#6B7280',
              transition: 'all 0.18s',
            }}
          >{p.replace('_', ' ')}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="live-indicator"><div className="dot" />SIMULATED DEMO</div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
        {/* Campus schematic */}
        <GlassCard style={{ position: 'relative', overflow: 'hidden' }} padding={12}>
          <CampusSchematic selected={selectedAsset} onSelect={setSelectedAsset} preset={selectedPreset} />
        </GlassCard>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }} className="styled-scroll">
          <KPICard label="Solar Farm"  value={solar.currentPower} unit="kW" color="#D97706"  icon={<Sun  size={13} />} small />
          <KPICard label="Wind Power"  value={windPower}          unit="kW" color="#2563EB"  icon={<Wind size={13} />} small />
          <KPICard label="Battery"     value={battery.soc}        unit="%"  color="#166534"  icon={<Battery size={13} />} small />
          <KPICard label="Total Load"  value={totalLoad}          unit="kW" color="#1E3A5F"  icon={<BarChart2 size={13} />} small />

          {selectedAsset && (
            <GlassCard padding="12px 14px">
              <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Asset Inspector</div>
              <AssetDetail id={selectedAsset} />
            </GlassCard>
          )}

          <GlassCard padding="12px 14px">
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Building Status</div>
            {buildings.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', color: b.status === 'ANOMALY' ? '#DC2626' : '#374151', fontWeight: b.status === 'ANOMALY' ? 600 : 400 }}>{b.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* ✅ Light-theme progress bar bg */}
                  <div style={{ width: 60, height: 4, background: '#E5E7EB', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${(b.currentLoad / b.peakLoad) * 100}%`, background: b.status === 'ANOMALY' ? '#DC2626' : '#2563EB', borderRadius: 2, transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'Space Grotesk', fontWeight: 600, color: '#111827' }}>{b.currentLoad.toFixed(1)} kW</span>
                </div>
              </div>
            ))}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
