import { memo } from 'react';
import { useGrid } from '../../store/gridStore';
import { SOURCES } from '../../sim/model';

// Generation → AI Control → Transmission (HVDC / HVAC) → Storage & Distribution → Receivers
const W = 1000, H = 470, NW = 128, NH = 46;

interface Node { id: string; x: number; y: number; label: string; value: string; color: string; sub?: string; }
interface Edge { from: string; to: string; mw: number; color: string; reverse?: boolean; }

function path(a: Node, b: Node) {
  const x1 = a.x + NW / 2, x2 = b.x - NW / 2;
  const mx = (x1 + x2) / 2;
  return `M${x1},${a.y} C${mx},${a.y} ${mx},${b.y} ${x2},${b.y}`;
}

const MODE_COLOR: Record<string, string> = { CHARGE: '#34D399', DISCHARGE: '#F5A524', RAMP: '#38BDF8', BALANCE: '#818CF8', EMERGENCY: '#F87171' };

function EnergyFlow() {
  const s = useGrid(st => st.snap);
  const g = s.gen;
  const color = (id: string) => SOURCES.find(x => x.id === id)!.color;
  const mw = (v: number) => `${Math.round(v).toLocaleString('en-IN')} MW`;
  const avgSoc = s.storage.filter(x => x.id !== 'flywheel').reduce((a, x) => a + x.soc, 0) / 4;
  const r = s.receivers;

  const nodes: Node[] = [
    { id: 'solar', x: 80, y: 62, label: 'Solar', value: mw(g.solar), color: color('solar') },
    { id: 'wind', x: 80, y: 132, label: 'Wind', value: mw(g.wind), color: color('wind') },
    { id: 'hydro', x: 80, y: 202, label: 'Hydro', value: mw(g.hydro), color: color('hydro') },
    { id: 'nuclear', x: 80, y: 272, label: 'Nuclear', value: mw(g.nuclear), color: color('nuclear') },
    { id: 'other', x: 80, y: 342, label: 'Geo + Biomass', value: mw(g.geothermal + g.biomass), color: color('biomass') },
    { id: 'thermal', x: 80, y: 412, label: 'Coal / Gas', value: mw(g.thermal), color: color('thermal') },
    { id: 'ai', x: 300, y: 237, label: 'DARPAN AI Control', value: s.decision.mode, color: MODE_COLOR[s.decision.mode], sub: `${s.renewableShare.toFixed(0)}% renewable` },
    { id: 'hvdc', x: 510, y: 150, label: '±800 kV HVDC', value: s.hvdc.online ? mw(s.hvdc.flow) : 'TRIPPED', color: s.hvdc.online ? '#22D3EE' : '#F87171', sub: `loss ${s.hvdc.losses.toFixed(0)} MW` },
    { id: 'hvac', x: 510, y: 324, label: '400 kV HVAC', value: mw(s.hvac.flow), color: '#A78BFA', sub: `${(s.hvac.loading * 100).toFixed(0)}% loaded` },
    { id: 'storage', x: 712, y: 92, label: 'Hybrid Storage', value: `${s.storageNet >= 0 ? '+' : ''}${mw(s.storageNet)}`, color: '#34D399', sub: `avg SoC ${avgSoc.toFixed(0)}%` },
    { id: 'dist', x: 712, y: 237, label: 'Substations', value: mw(s.demand), color: '#38BDF8', sub: `${s.frequency.toFixed(2)} Hz` },
    { id: 'tie', x: 712, y: 382, label: 'Regional Tie', value: s.tieFlow > 1 ? `↓ ${mw(s.tieFlow)}` : s.tieFlow < -1 ? `↑ ${mw(-s.tieFlow)}` : 'idle', color: '#94A3B8', sub: s.tieFlow > 1 ? 'importing' : s.tieFlow < -1 ? 'exporting' : '' },
    { id: 'homes', x: 920, y: 62, label: 'Homes', value: mw(r.homes), color: '#F472B6' },
    { id: 'industry', x: 920, y: 149, label: 'Industry', value: mw(r.industry), color: '#94A3B8' },
    { id: 'commercial', x: 920, y: 237, label: 'Commercial', value: mw(r.commercial), color: '#FBBF24' },
    { id: 'ev', x: 920, y: 324, label: 'EV Charging', value: mw(r.ev), color: '#34D399' },
    { id: 'critical', x: 920, y: 412, label: 'Critical Loads', value: mw(r.critical), color: '#F87171' },
  ];
  const N = Object.fromEntries(nodes.map(n => [n.id, n]));

  const edges: Edge[] = [
    { from: 'solar', to: 'ai', mw: g.solar, color: color('solar') },
    { from: 'wind', to: 'ai', mw: g.wind, color: color('wind') },
    { from: 'hydro', to: 'ai', mw: g.hydro, color: color('hydro') },
    { from: 'nuclear', to: 'ai', mw: g.nuclear, color: color('nuclear') },
    { from: 'other', to: 'ai', mw: g.geothermal + g.biomass, color: color('biomass') },
    { from: 'thermal', to: 'ai', mw: g.thermal, color: color('thermal') },
    { from: 'ai', to: 'hvdc', mw: s.hvdc.flow, color: '#22D3EE' },
    { from: 'ai', to: 'hvac', mw: s.totalGen - s.hvdc.flow, color: '#A78BFA' },
    { from: 'hvdc', to: 'dist', mw: s.hvdc.flow, color: '#22D3EE' },
    { from: 'hvac', to: 'dist', mw: s.hvac.flow, color: '#A78BFA' },
    { from: 'storage', to: 'dist', mw: Math.abs(s.storageNet), color: '#34D399', reverse: s.storageNet > 0 },
    { from: 'tie', to: 'dist', mw: Math.abs(s.tieFlow), color: '#94A3B8', reverse: s.tieFlow < 0 },
    { from: 'dist', to: 'homes', mw: r.homes, color: '#F472B6' },
    { from: 'dist', to: 'industry', mw: r.industry, color: '#94A3B8' },
    { from: 'dist', to: 'commercial', mw: r.commercial, color: '#FBBF24' },
    { from: 'dist', to: 'ev', mw: r.ev, color: '#34D399' },
    { from: 'dist', to: 'critical', mw: r.critical, color: '#F87171' },
  ];

  // storage / tie sit in the same column as substations; route them vertically
  const edgePath = (e: Edge) => {
    const a = N[e.from], b = N[e.to];
    if (a.x === b.x) {
      const y1 = a.y + (a.y < b.y ? NH / 2 : -NH / 2), y2 = b.y + (a.y < b.y ? -NH / 2 : NH / 2);
      return `M${a.x},${y1} L${b.x},${y2}`;
    }
    return path(a, b);
  };

  const headers = [['Generation', 80], ['AI Control', 300], ['Transmission', 510], ['Storage & Distribution', 712], ['Receivers', 920]] as const;

  return (
    <>
    <div className="md:hidden mb-1 text-[11px] text-muted">Swipe sideways to follow the full flow →</div>
    <div className="overflow-x-auto scroll-thin -mx-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[760px] w-full h-auto select-none" role="img" aria-label="Live energy flow diagram">
        {headers.map(([label, x]) => (
          <text key={label} x={x} y={20} textAnchor="middle" className="fill-muted" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</text>
        ))}

        {edges.map(e => {
          const d = edgePath(e);
          const active = e.mw > 1;
          const width = active ? 1.5 + Math.min(7, (e.mw / 900) * 7) : 1;
          const speed = active ? Math.max(0.5, 2.2 - e.mw / 600) : 0;
          return (
            <g key={`${e.from}-${e.to}`}>
              <path d={d} fill="none" stroke="rgb(var(--line))" strokeWidth={width + 1} strokeLinecap="round" />
              {active && (
                <path d={d} fill="none" stroke={e.color} strokeWidth={width} strokeLinecap="round"
                  className={`flow-line${e.reverse ? ' rev' : ''}`} style={{ ['--flow-speed' as string]: `${speed}s` }} opacity={0.9} />
              )}
            </g>
          );
        })}

        {nodes.map(n => {
          const big = n.id === 'ai';
          const w = big ? NW + 16 : NW, h = big ? NH + 22 : NH;
          return (
            <g key={n.id} transform={`translate(${n.x - w / 2},${n.y - h / 2})`}>
              <rect width={w} height={h} rx={10} fill="rgb(var(--surface-2))" stroke={n.color} strokeOpacity={0.55} strokeWidth={big ? 2 : 1.2} />
              <rect x={0} y={8} width={3} height={h - 16} rx={1.5} fill={n.color} />
              <text x={12} y={17} className="fill-muted" style={{ fontSize: 10, fontWeight: 500 }}>{n.label}</text>
              <text x={12} y={34} className="fill-fg" style={{ fontSize: big ? 15 : 13, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', fill: big ? n.color : undefined }}>{n.value}</text>
              {n.sub && <text x={12} y={big ? 54 : 44} className="fill-muted" style={{ fontSize: 9 }}>{big ? n.sub : ''}</text>}
            </g>
          );
        })}
        {/* secondary labels under transmission/storage nodes */}
        {nodes.filter(n => n.sub && n.id !== 'ai').map(n => (
          <text key={`${n.id}-sub`} x={n.x} y={n.y + NH / 2 + 13} textAnchor="middle" className="fill-muted" style={{ fontSize: 9.5 }}>{n.sub}</text>
        ))}
      </svg>
    </div>
    </>
  );
}

export default memo(EnergyFlow);
