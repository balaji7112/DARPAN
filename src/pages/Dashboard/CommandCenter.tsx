import React from 'react';
import { motion } from 'framer-motion';
import { useEnergyStore } from '../../store/energyStore';
import { useUIStore } from '../../store/uiStore';
import KPICard from '../../components/ui/KPICard';
import GlassCard from '../../components/ui/GlassCard';
import LiveSolarChart from '../../components/charts/LiveSolarChart';
import LiveLoadChart from '../../components/charts/LiveLoadChart';
import LiveBatteryChart from '../../components/charts/LiveBatteryChart';
import {
  Sun, Battery, Zap, Leaf, Activity, TrendingDown, DollarSign, Star,
  Bot, Wind, Factory, School, PlugZap, BarChart3,
} from 'lucide-react';

// ── Shared text colours ──────────────────────────────────────────────────────
const T_PRIMARY   = '#111827';   // black primary text
const T_SECONDARY = '#374151';   // near-black secondary
const T_MUTED     = '#6B7280';   // muted grey labels

// ── KPI Strip ──────────────────────────────────────────────────────────────
function KPIStrip() {
  const {
    solar, battery, totalLoad, gridDependency, renewableShare,
    co2Avoided, oorjaSyncScore, estimatedCostSaving, windPower,
  } = useEnergyStore();

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }} className="styled-scroll">
      <KPICard label="Renewable Generation" value={solar.currentPower + windPower} unit="kW"  trend={13.2}  trendLabel="vs yesterday" color="var(--color-solar)"    icon={<Sun size={13} />}          small />
      <KPICard label="Current Load"         value={totalLoad}                      unit="kW"  trend={-2.1}  trendLabel="vs 1h ago"   color={T_MUTED}                icon={<Activity size={13} />}     small />
      <KPICard label="Battery SOC"          value={battery.soc}                    unit="%"   color={battery.soc > 50 ? 'var(--color-success)' : battery.soc > 25 ? 'var(--color-solar)' : 'var(--color-critical)'}  icon={<Battery size={13} />}      small />
      <KPICard label="Grid Dependency"      value={gridDependency}                 unit="%"   trend={-8.4}  trendLabel="vs yesterday" color={gridDependency < 20 ? 'var(--color-success)' : gridDependency < 40 ? 'var(--color-solar)' : 'var(--color-critical)'} icon={<Zap size={13} />} small />
      <KPICard label="Renewable Share"      value={renewableShare}                 unit="%"   color="var(--color-primary)" icon={<Leaf size={13} />}          small />
      <KPICard label="CO₂ Avoided"          value={co2Avoided}                     unit="kg/hr" color="var(--color-success)"  icon={<TrendingDown size={13} />}  small />
      <KPICard label="Est. Cost Saving"     value={`₹${estimatedCostSaving}`}      unit="/day" color="var(--color-solar)"    icon={<DollarSign size={13} />}   small />
      <KPICard label="DARPAN Score"         value={oorjaSyncScore.total}            unit="/100" color={oorjaSyncScore.total >= 80 ? 'var(--color-success)' : oorjaSyncScore.total >= 60 ? 'var(--color-solar)' : 'var(--color-critical)'} icon={<Star size={13} />} small />
    </div>
  );
}

// ── Icon map for energy-flow nodes (Lucide outline icons, no emojis) ─────────
const NODE_ICON: Record<string, React.ReactNode> = {
  solar:   <Sun       size={18} strokeWidth={1.6} />,
  wind:    <Wind      size={18} strokeWidth={1.6} />,
  hub:     <PlugZap   size={18} strokeWidth={1.6} />,
  battery: <Battery   size={18} strokeWidth={1.6} />,
  grid:    <Factory   size={18} strokeWidth={1.6} />,
  campus:  <School    size={18} strokeWidth={1.6} />,
};

// ── Energy Flow Diagram ───────────────────────────────────────────────────────
function EnergyFlowDiagram() {
  const { solar, battery, totalLoad, windPower, gridDependency, renewableShare, energyState } = useEnergyStore();

  const stateColor: Record<string, string> = {
    SURPLUS:  '#166534',   // dark green
    BALANCED: '#2563EB',   // blue
    DEFICIT:  '#D97706',   // amber
    CRITICAL: '#DC2626',   // red
    NORMAL:   '#166534',   // dark green
    FAULT:    '#DC2626',   // red
  };
  const sc = stateColor[energyState] || '#2563EB';

  // ── Node — white card + Lucide icon, consistent with light theme ──────────
  const Node = ({ id, label, value, unit, color, x, y, size = 90 }: {
    id: string; label: string; value: string; unit?: string; color: string; x: number; y: number; size?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
        /* ✅ White card — light theme consistent, no more dark bg */
        background: '#FFFFFF',
        border: `1.5px solid ${color}40`,
        borderRadius: 12, width: size, padding: '10px 8px', textAlign: 'center',
        boxShadow: '0 1px 4px rgba(16,24,40,0.08)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
      }}
    >
      {/* ✅ Professional Lucide outline icon instead of emoji */}
      <div style={{ color, lineHeight: 1 }}>
        {NODE_ICON[id] ?? <PlugZap size={18} strokeWidth={1.6} />}
      </div>
      <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.88rem', color: T_PRIMARY, lineHeight: 1 }}>
        {value}<span style={{ fontSize: '0.6rem', color: T_MUTED, marginLeft: 2 }}>{unit}</span>
      </div>
      <div style={{ fontSize: '0.58rem', color: T_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.2 }}>
        {label}
      </div>
    </motion.div>
  );

  // Flow lines — light-theme appropriate colours
  const FlowLine = ({ from, to, active = true, color }: {
    from: [number, number]; to: [number, number]; active?: boolean; color: string;
  }) => {
    const x1 = `${from[0]}%`, y1 = `${from[1]}%`, x2 = `${to[0]}%`, y2 = `${to[1]}%`;
    const id = `arr-${color.replace(/[^a-z0-9]/gi, '')}`;
    return (
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <marker id={id} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={active ? color : '#D1D5DB'} />
          </marker>
        </defs>
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={active ? color : '#D1D5DB'}
          strokeWidth={active ? 1.5 : 1}
          strokeDasharray={active ? '6 4' : '3 6'}
          markerEnd={`url(#${id})`}
          opacity={active ? 0.65 : 0.35}
        />
      </svg>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 280, background: '#F9FAFB', borderRadius: 10 }}>
      {/* State badge */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${sc}12`, border: `1px solid ${sc}30`, borderRadius: 20, padding: '3px 10px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc, animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, color: sc, fontSize: '0.75rem' }}>{energyState}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 5 }}>
        <div className="live-indicator"><div className="dot" />SIMULATED</div>
      </div>

      {/* Flow lines */}
      <FlowLine from={[20,28]} to={[50,50]} active={solar.currentPower > 2} color="#D97706" />
      <FlowLine from={[80,28]} to={[50,50]} active={windPower > 0.5}        color="#2563EB" />
      <FlowLine from={[50,50]} to={[20,72]} active={true}                   color="#2563EB" />
      <FlowLine from={[50,50]} to={[80,72]} active={gridDependency < 80}    color="#64748B" />
      <FlowLine from={[50,50]} to={[50,82]} active={totalLoad > 0}          color="#166534" />

      {/* Nodes */}
      <Node id="solar"   label="Solar Farm"  value={solar.currentPower.toFixed(1)} unit="kW"  color="#D97706" x={20} y={28} />
      <Node id="wind"    label="Wind"        value={windPower.toFixed(1)}           unit="kW"  color="#2563EB" x={80} y={28} />
      <Node id="hub"     label="Energy Hub"  value={renewableShare.toFixed(0)}      unit="%RE" color="#2563EB" x={50} y={50} size={96} />
      <Node id="battery" label="Battery"     value={battery.soc.toFixed(0)}         unit="%"   color="#166534" x={20} y={72} />
      <Node id="grid"    label="Grid"        value={gridDependency.toFixed(0)}      unit="%"   color="#64748B" x={80} y={72} />
      <Node id="campus"  label="Campus Load" value={totalLoad.toFixed(1)}           unit="kW"  color="#1E3A5F" x={50} y={86} />

      <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: '0.6rem', color: T_MUTED }}>
        Energy Flow — Smart Campus, Bhopal · All values SIMULATED
      </div>
    </div>
  );
}

// ── AI Decision Panel ───────────────────────────────────────────────────────
function AIDecisionPanel() {
  const { recommendations, optimizationDecision, anomalies, energyState } = useEnergyStore();
  const { approveRecommendation, rejectRecommendation } = useEnergyStore();
  const setCopilotOpen = useUIStore(s => s.setCopilotOpen);

  const pendingRecs = recommendations.filter(r => r.status === 'PENDING').slice(0, 3);

  const priorityColor = (p: string) =>
    p === 'HIGH' ? '#DC2626' : p === 'MEDIUM' ? '#D97706' : T_MUTED;

  const stateColor: Record<string, string> = {
    SURPLUS:  '#166534',
    BALANCED: '#2563EB',
    DEFICIT:  '#D97706',
    CRITICAL: '#DC2626',
    NORMAL:   '#166534',
    FAULT:    '#DC2626',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflowY: 'auto' }} className="styled-scroll">

      {/* Energy State */}
      <GlassCard padding="12px 14px">
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T_MUTED, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Energy State
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: stateColor[energyState] || T_MUTED, animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, color: stateColor[energyState] || T_PRIMARY, fontSize: '1rem' }}>
            {energyState}
          </span>
        </div>
        {optimizationDecision && (
          <div style={{ marginTop: 8, padding: '8px 10px', background: '#F9FAFB', borderRadius: 8, fontSize: '0.75rem', lineHeight: 1.5, border: '1px solid #E5E7EB' }}>
            <span style={{ color: '#1E3A5F', fontWeight: 600 }}>
              <PlugZap size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {optimizationDecision.action}
            </span>
            <span style={{ color: T_SECONDARY, marginLeft: 6 }}>— {optimizationDecision.reason.slice(0, 70)}...</span>
          </div>
        )}
      </GlassCard>

      {/* Recommendations label */}
      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 2px' }}>
        DARPAN Intelligence
      </div>

      {pendingRecs.length === 0 && (
        <GlassCard padding="12px 14px">
          <div style={{ color: T_MUTED, fontSize: '0.8rem' }}>No pending recommendations. System optimized.</div>
        </GlassCard>
      )}

      {pendingRecs.map(rec => (
        <GlassCard key={rec.id} padding="12px 14px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: priorityColor(rec.priority), letterSpacing: '0.06em' }}>
              {rec.priority}
            </span>
            <span style={{ fontSize: '0.62rem', color: T_MUTED }}>Confidence: {rec.confidence}%</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 4, color: T_PRIMARY }}>{rec.title}</div>
          <div style={{ fontSize: '0.73rem', color: T_SECONDARY, lineHeight: 1.5, marginBottom: 8 }}>{rec.reason.slice(0, 90)}...</div>
          {/* Confidence bar */}
          <div style={{ height: 3, background: '#E5E7EB', borderRadius: 2, marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${rec.confidence}%`, background: '#2563EB', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => approveRecommendation(rec.id)}
              style={{ flex: 1, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '5px', color: '#166534', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}
            >
              Approve
            </button>
            <button
              onClick={() => rejectRecommendation(rec.id)}
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 10px', color: T_MUTED, cursor: 'pointer', fontSize: '0.7rem' }}
            >
              Dismiss
            </button>
          </div>
        </GlassCard>
      ))}

      {/* Active anomalies */}
      {anomalies.length > 0 && (
        <GlassCard padding="12px 14px" glow="critical">
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Active Anomalies
          </div>
          {anomalies.slice(0, 2).map(a => (
            <div key={a.id} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: T_PRIMARY }}>{a.asset} — {a.type}</div>
              <div style={{ fontSize: '0.72rem', color: T_SECONDARY }}>Severity: {a.severity} · Score: {a.score.toFixed(2)}</div>
            </div>
          ))}
        </GlassCard>
      )}

      {/* DARPAN Copilot button */}
      <button
        onClick={() => setCopilotOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#EFF6FF', border: '1px solid #BFDBFE',
          borderRadius: 10, padding: '10px 14px', color: '#1E3A5F',
          cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, width: '100%',
        }}
      >
        <Bot size={14} strokeWidth={1.6} />
        Ask DARPAN Copilot
      </button>
    </div>
  );
}

// ── Chart label style ─────────────────────────────────────────────────────────
const chartLabel = {
  fontSize: '0.65rem', fontWeight: 600 as const, color: T_MUTED,
  marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em',
};

// ── Main CommandCenter ────────────────────────────────────────────────────────
export default function CommandCenter() {
  return (
    <div style={{ height: 'calc(100vh - 88px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <KPIStrip />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, minHeight: 0 }}>
        {/* Center: Energy Flow + bottom charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <GlassCard style={{ flex: '0 0 55%', position: 'relative', overflow: 'hidden', minHeight: 300 }} padding={12}>
            <EnergyFlowDiagram />
          </GlassCard>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, minHeight: 0 }}>
            <GlassCard padding="10px 12px">
              <div style={chartLabel}>Solar Generation</div>
              <LiveSolarChart height={100} />
            </GlassCard>
            <GlassCard padding="10px 12px">
              <div style={chartLabel}>Campus Load</div>
              <LiveLoadChart height={100} />
            </GlassCard>
            <GlassCard padding="10px 12px">
              <div style={chartLabel}>Battery SOC</div>
              <LiveBatteryChart height={100} />
            </GlassCard>
          </div>
        </div>
        {/* Right: AI Panel */}
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <AIDecisionPanel />
        </div>
      </div>
    </div>
  );
}
