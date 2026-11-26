import { Sun, Cpu, Cable, BatteryCharging, Home, RefreshCw, ArrowRight, Server, Radio, Clock, ShieldCheck } from 'lucide-react';
import { Card, PageHeader, Pill } from '../../components/ui/kit';

const LAYERS = [
  { icon: Sun, title: 'Generation', items: ['Solar PV / CSP', 'Wind', 'Hydro & marine', 'Geothermal', 'Biomass', 'Nuclear', 'Coal / gas (transition)'] },
  { icon: Cpu, title: 'AI / Software Control', items: ['Forecasting (RF, HistGB)', 'Anomaly detection (Isolation Forest)', 'Real-time telemetry', 'Demand / supply matching', 'LLM copilot (advisory)'] },
  { icon: Cable, title: 'Smart Transmission', items: ['±800 kV HVDC for bulk RE', '400 kV HVAC mesh', 'Smart routing', 'Minimal AC/DC conversion'] },
  { icon: BatteryCharging, title: 'Storage & Reserve', items: ['Flywheel (ms response)', 'Li-ion & sodium-ion', 'Pumped hydro (bulk)', 'Graphite thermal (emergency)'] },
  { icon: Home, title: 'Energy Receivers', items: ['Homes', 'EV charging', 'Commercial & industry', 'Critical / emergency loads'] },
];

const ADVANCED = [
  { icon: Server, title: 'IEC 61850-3 edge computing', text: 'Fanless industrial PCs with heatsink cooling at substations. Critical protection and control stay on the local edge; cloud AI is advisory only.' },
  { icon: Radio, title: 'PMU + TSN', text: 'Phasor measurement units stream synchronised phasors over time-sensitive networking for low-latency wide-area monitoring.' },
  { icon: Clock, title: 'PCIe atomic clock', text: 'High-precision time reference (with GPS) so phasor timestamps across the grid align to well under a microsecond.' },
  { icon: ShieldCheck, title: 'Protection', text: 'Early-warning sensors, relays, fault-location algorithms and coordinated breakers. SPDs handle transient over-voltage but do not replace fault-current protection.' },
];

const STACK = [
  ['Frontend', 'React 18, TypeScript, Vite, Tailwind CSS'],
  ['State', 'Zustand: 3-second telemetry refresh from the grid simulator'],
  ['Visualisation', 'Apache ECharts (tree-shaken) + animated SVG energy flow'],
  ['AI / ML', 'Python FastAPI service: RandomForest (solar), HistGradientBoosting (demand), IsolationForest (anomalies), trained on synthetic telemetry'],
  ['Copilot', 'Rule-based engine on live grid state; optional LLM via server-side proxy'],
  ['Database', 'PostgreSQL planned for telemetry history (demo runs fully in-browser)'],
];

const ROLLOUT = ['Solar', 'Wind', 'Coal (conventional)', 'Hydro & geothermal'];

export default function ArchitecturePage() {
  return (
    <div className="fade-up space-y-4">
      <PageHeader title="System Architecture" subtitle="Generation → AI Control → Smart Transmission → Storage → Energy Receivers" />

      <Card title="Methodology" subtitle="Continuous equilibrium loop: monitor → predict → route → store / discharge → supply">
        <div className="grid gap-3 md:grid-cols-5">
          {LAYERS.map(({ icon: Icon, title, items }, i) => (
            <div key={title} className="relative rounded-xl border border-line bg-surface2/50 p-3.5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary"><Icon size={16} /></span>
                <span className="text-sm font-semibold">{title}</span>
              </div>
              <ul className="mt-2.5 space-y-1 text-xs text-muted">{items.map(it => <li key={it}>• {it}</li>)}</ul>
              {i < LAYERS.length - 1 && <ArrowRight size={16} className="hidden md:block absolute -right-[13px] top-1/2 -translate-y-1/2 text-primary z-10 bg-surface rounded-full" />}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted"><RefreshCw size={13} className="text-primary" /> Target: 24/7 readiness with minimum unplanned downtime</div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Advanced smart-grid technologies" subtitle="Design level: represented as simulated views in this demo">
          <div className="grid gap-3 sm:grid-cols-2">
            {ADVANCED.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-lg border border-line p-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Icon size={15} className="text-primary" />{title}</div>
                <p className="mt-1.5 text-xs text-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Software stack (this demo)">
          <dl className="divide-y divide-line">
            {STACK.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-3 py-2.5 text-sm">
                <dt className="text-muted text-xs font-medium">{k}</dt><dd className="text-xs leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Phased rollout">
          <ol className="flex flex-wrap items-center gap-2">
            {ROLLOUT.map((p, i) => (
              <li key={p} className="flex items-center gap-2">
                <span className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-bg text-[10px] font-bold">{i + 1}</span>{p}</span>
                {i < ROLLOUT.length - 1 && <ArrowRight size={14} className="text-muted" />}
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Risks & mitigation">
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div><div className="label mb-1.5">Risks</div><div className="flex flex-wrap gap-1.5">{['Integration & stability', 'Protection & faults', 'Latency', 'Demand variability'].map(r => <Pill key={r} tone="warn">{r}</Pill>)}</div></div>
            <div><div className="label mb-1.5">Mitigation</div><div className="flex flex-wrap gap-1.5">{['Rapid HVDC fault isolation', 'Robust optimisation', 'Redundant data servers', 'Edge-first control'].map(r => <Pill key={r} tone="ok">{r}</Pill>)}</div></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
