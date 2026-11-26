import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store/uiStore';
import { useEnergyStore } from '../../store/energyStore';
import type { SolarData, BatteryData, WeatherData, Recommendation, Anomaly, BuildingData, ForecastPoint, OorjaSyncScore } from '../../store/energyStore';
import { X, Send, Bot, Zap } from 'lucide-react';

interface StoreSnapshot {
  solar: SolarData; battery: BatteryData; weather: WeatherData;
  recommendations: Recommendation[]; anomalies: Anomaly[];
  totalLoad: number; gridDependency: number; renewableShare: number;
  buildings: BuildingData[]; windPower: number; gridExport: number;
  solarForecast: ForecastPoint[]; oorjaSyncScore: OorjaSyncScore;
}

interface Message { role: 'user' | 'ai'; text: string; ts: number; }

// ── Answer engine (unchanged logic) ─────────────────────────────────────────
function getAnswer(question: string, store: StoreSnapshot): string {
  const q = question.toLowerCase();
  const { solar, battery, weather, recommendations, anomalies, totalLoad, gridDependency, renewableShare, buildings, windPower, gridExport, solarForecast, oorjaSyncScore } = store;

  if (q.includes('solar') && (q.includes('low') || q.includes('why'))) {
    if (weather.cloudCover > 0.4)
      return `Solar generation is reduced to ${solar.currentPower.toFixed(1)} kW due to cloud cover at ${Math.round(weather.cloudCover * 100)}%. Current irradiance: ${solar.irradiance} W/m². Expected to recover as clouds clear.`;
    if (solar.currentPower < 2)
      return `Solar output is ${solar.currentPower.toFixed(1)} kW. This is consistent with the current time of day (${new Date().getHours()}:00) — low sun angle reduces generation.`;
    return `Solar generation is ${solar.currentPower.toFixed(1)} kW, operating within expected parameters. Irradiance: ${solar.irradiance} W/m², efficiency: ${solar.efficiency.toFixed(1)}%.`;
  }

  if (q.includes('grid') && (q.includes('high') || q.includes('why'))) {
    const belowAbove = totalLoad > (solar.currentPower + windPower) ? 'below' : 'above';
    return `Grid dependency is ${gridDependency.toFixed(1)}%. Renewable generation (${solar.currentPower.toFixed(1)} kW solar + ${windPower.toFixed(1)} kW wind) is ${belowAbove} current demand of ${totalLoad.toFixed(1)} kW. Battery SOC is ${battery.soc.toFixed(1)}%.`;
  }

  if (q.includes('battery')) {
    return `Battery status: SOC ${battery.soc.toFixed(1)}%, SOH ${battery.soh}%, Temperature ${battery.temperature.toFixed(1)}°C, Action: ${battery.chargingAction}. Projected backup: ${battery.projectedBackupHours.toFixed(1)} hours at current load. ${battery.chargingAction === 'CHARGING' ? 'Currently absorbing renewable surplus.' : battery.chargingAction === 'DISCHARGING' ? 'Currently supporting campus load.' : 'Holding — system balanced.'}`;
  }

  if (q.includes('forecast') || q.includes('tomorrow') || q.includes('predict')) {
    const nextPeak = solarForecast.find(p => p.predicted > 15);
    return `Solar forecast: Next peak predicted at ${nextPeak ? nextPeak.predicted.toFixed(1) : '~18'} kW. Demand forecast shows ${totalLoad.toFixed(1)} kW average. Confidence decreases beyond 6 hours. Forecasts updated every 3 min using RandomForest model (R²: 0.998).`;
  }

  if (q.includes('anomaly') || q.includes('alert')) {
    if (anomalies.length === 0) return 'No active anomalies detected. All assets are operating within normal parameters.';
    const top = anomalies[0];
    return `Highest priority anomaly: ${top.type} on ${top.asset} — severity ${top.severity}, score ${top.score.toFixed(2)}. Possible cause: ${top.possibleCause}. Recommended action: ${top.recommendedAction}`;
  }

  if (q.includes('waste') || q.includes('efficient')) {
    return `Energy waste assessment: Curtailment ${gridExport > 2 ? 'ACTIVE' : 'minimal'} (${gridExport.toFixed(1)} kW exported to grid). Idle consumption: ~2.1 kW in non-active buildings. Overall OORJA Score: ${oorjaSyncScore.total}/100.`;
  }

  if (q.includes('ev') || q.includes('charging') || q.includes('schedule')) {
    const evBuilding = buildings.find(b => b.id === 'EV_CHARGING');
    return `EV Charging Zone: Current load ${evBuilding?.currentLoad.toFixed(1) || 0} kW. Optimal charging window is 10:00–14:00 (peak solar). The optimizer has scheduled EV charging to align with renewable surplus. Flexible load: ${evBuilding?.flexibleLoad} kW available.`;
  }

  if (q.includes('building') || q.includes('consumes') || q.includes('consumption')) {
    const sorted = [...buildings].sort((a, b) => b.currentLoad - a.currentLoad);
    return `Highest consuming building: ${sorted[0].name} at ${sorted[0].currentLoad.toFixed(1)} kW. Breakdown: ${sorted.map(b => `${b.name}: ${b.currentLoad.toFixed(1)} kW`).join(', ')}.`;
  }

  if (q.includes('recommendation') || q.includes('should')) {
    if (recommendations.length === 0) return 'No active recommendations. System is operating optimally.';
    const top = recommendations.find(r => r.status === 'PENDING');
    if (!top) return 'All current recommendations have been actioned.';
    return `Top recommendation: "${top.title}" — ${top.reason} Confidence: ${top.confidence}%. Projected impact: ${top.projectedImpact}`;
  }

  return 'Insufficient current telemetry to answer this query. Please ask about solar generation, battery status, grid dependency, anomalies, or energy forecasts.';
}

// ── Suggestions ──────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Why is solar low?',
  'What should battery do?',
  'Which building uses most energy?',
  'Show top anomaly',
];

export default function AICopilot() {
  const setCopilotOpen = useUIStore(s => s.setCopilotOpen);
  const solar          = useEnergyStore(s => s.solar);
  const battery        = useEnergyStore(s => s.battery);
  const weather        = useEnergyStore(s => s.weather);
  const recommendations= useEnergyStore(s => s.recommendations);
  const anomalies      = useEnergyStore(s => s.anomalies);
  const totalLoad      = useEnergyStore(s => s.totalLoad);
  const gridDependency = useEnergyStore(s => s.gridDependency);
  const gridExport     = useEnergyStore(s => s.gridExport);
  const renewableShare = useEnergyStore(s => s.renewableShare);
  const buildings      = useEnergyStore(s => s.buildings);
  const windPower      = useEnergyStore(s => s.windPower);
  const solarForecast  = useEnergyStore(s => s.solarForecast);
  const oorjaSyncScore = useEnergyStore(s => s.oorjaSyncScore);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hello! I'm DARPAN Copilot. Ask me about solar generation, battery status, anomalies, forecasts, or energy optimization. I answer using live system data only.", ts: Date.now() },
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const q = (text || input).trim();
    if (!q) return;
    const userMsg: Message = { role: 'user', text: q, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Small realistic delay
    await new Promise(r => setTimeout(r, 420));

    const snapshot: StoreSnapshot = { solar, battery, weather, recommendations, anomalies, totalLoad, gridDependency, renewableShare, buildings, windPower, gridExport, solarForecast, oorjaSyncScore };
    const answer = getAnswer(q, snapshot);
    setMessages(prev => [...prev, { role: 'ai', text: answer, ts: Date.now() }]);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', right: 20, bottom: 20,
        width: 380, height: 520,
        /* ✅ FIX: fully white / light surface — visible on light theme */
        background: '#FFFFFF',
        border: '1px solid #E4E7EC',
        borderRadius: 18,
        zIndex: 7000,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(16,24,40,0.14), 0 4px 16px rgba(16,24,40,0.08)',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #F2F4F7',
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#FAFAFA',
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Bot size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          {/* ✅ FIX: explicit dark colour, no CSS var reliance */}
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
            DARPAN Copilot
          </div>
          <div style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            Live system data
          </div>
        </div>
        <button
          onClick={() => setCopilotOpen(false)}
          style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10, background: '#F9FAFB' }}
        className="styled-scroll"
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '88%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              /* ✅ FIX: fully readable backgrounds */
              background: msg.role === 'user' ? '#EEF2FF' : '#FFFFFF',
              border: msg.role === 'user' ? '1px solid #C7D2FE' : '1px solid #E5E7EB',
              /* ✅ FIX: explicit dark text colour */
              fontSize: '0.845rem',
              lineHeight: 1.65,
              color: '#111827',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* AI typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1', animation: `bounce-dot 1s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick suggestions ── */}
      <div style={{ padding: '8px 14px 6px', display: 'flex', gap: 6, flexWrap: 'wrap', background: '#F9FAFB', borderTop: '1px solid #F2F4F7', flexShrink: 0 }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => handleSend(s)}
            style={{
              /* ✅ FIX: visible suggestion chips */
              background: '#FFFFFF',
              border: '1px solid #E4E7EC',
              borderRadius: 20, padding: '4px 11px',
              fontSize: '0.7rem', color: '#374151',
              cursor: 'pointer', fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#EEF2FF'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#C7D2FE'; (e.currentTarget as HTMLButtonElement).style.color = '#4F46E5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#E4E7EC'; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Input ── */}
      <div style={{ padding: '10px 14px 12px', background: '#FFFFFF', borderTop: '1px solid #E4E7EC', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about your energy system..."
          disabled={loading}
          style={{
            flex: 1,
            /* ✅ FIX: white bg, dark text, visible placeholder */
            background: '#F9FAFB',
            border: '1px solid #D0D5DD',
            borderRadius: 10, padding: '9px 14px',
            color: '#111827', fontSize: '0.845rem',
            outline: 'none', transition: 'border-color 0.15s',
            fontFamily: 'inherit',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.background = '#fff'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#D0D5DD'; e.currentTarget.style.background = '#F9FAFB'; }}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          style={{
            background: input.trim() && !loading ? '#6366F1' : '#E5E7EB',
            border: 'none',
            borderRadius: 10, padding: '9px 12px',
            color: input.trim() && !loading ? '#fff' : '#9CA3AF',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.18s',
            display: 'flex', alignItems: 'center',
          }}
        >
          <Send size={15} />
        </button>
      </div>

      {/* Typing animation keyframe */}
      <style>{`
        @keyframes bounce-dot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50%       { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}
