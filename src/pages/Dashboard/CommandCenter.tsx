import { Link } from 'react-router-dom';
import { Activity, Factory, Leaf, Gauge, BatteryCharging, CloudSun, Bot, ArrowRight } from 'lucide-react';
import { useGrid } from '../../store/gridStore';
import { useUI } from '../../store/uiStore';
import { STORAGE } from '../../sim/model';
import EnergyFlow from '../../components/flow/EnergyFlow';
import { GenerationMixChart, DuckCurveChart } from '../../components/charts/GridCharts';
import { Card, Stat, Bar, Pill, SeverityBadge, Empty, fmt, cx } from '../../components/ui/kit';

function KPIs() {
  const s = useGrid(st => st.snap);
  const avgSoc = s.storage.filter(x => x.id !== 'flywheel').reduce((a, x) => a + x.soc, 0) / 4;
  const fTone = !s.telemetryOk ? 'warn' : s.frequency < 49.9 || s.frequency > 50.05 ? 'crit' : 'ok';
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <Stat label="Demand" icon={<Activity size={13} />} value={fmt(s.demand)} unit="MW" hint={s.isPeak ? 'Evening peak window' : `Peak today ${fmt(s.today.peakDemand)} MW`} />
      <Stat label="Generation" icon={<Factory size={13} />} value={fmt(s.totalGen)} unit="MW" hint={s.tieFlow > 1 ? `Importing ${fmt(s.tieFlow)} MW` : s.tieFlow < -1 ? `Exporting ${fmt(-s.tieFlow)} MW` : 'Tie line idle'} />
      <Stat label="Renewable share" icon={<Leaf size={13} />} value={s.renewableShare.toFixed(0)} unit="%" tone={s.renewableShare > 50 ? 'ok' : 'fg'} hint={`Solar ${fmt(s.gen.solar)} · Wind ${fmt(s.gen.wind)} MW`} />
      <Stat label="Frequency" icon={<Gauge size={13} />} value={s.frequency.toFixed(3)} unit="Hz" tone={fTone} hint={s.telemetryOk ? 'Band 49.90–50.05 Hz' : 'PMU telemetry stale'} />
      <Stat label="Storage SoC" icon={<BatteryCharging size={13} />} value={avgSoc.toFixed(0)} unit="%" tone={avgSoc < 25 ? 'warn' : 'fg'} hint={s.storageNet > 1 ? `Charging ${fmt(s.storageNet)} MW` : s.storageNet < -1 ? `Discharging ${fmt(-s.storageNet)} MW` : 'Holding'} />
      <Stat label="CO₂ avoided today" icon={<CloudSun size={13} />} value={fmt(s.today.co2AvoidedT)} unit="t" tone="ok" hint={`${fmt(s.today.renewableMWh)} MWh renewable`} />
    </div>
  );
}

const MODE_TONE = { CHARGE: 'ok', DISCHARGE: 'warn', RAMP: 'primary', BALANCE: 'primary', EMERGENCY: 'crit' } as const;

function AIPanel() {
  const decision = useGrid(s => s.snap.decision);
  const faults = useGrid(s => s.snap.faults);
  const alerts = useGrid(s => s.alerts);
  const setCopilot = useUI(s => s.setCopilotOpen);
  const open = alerts.filter(a => a.status !== 'resolved').slice(0, 4);
  return (
    <Card title="AI Control" subtitle="Dispatch decision this interval" action={<Pill tone={MODE_TONE[decision.mode]}>{decision.mode}</Pill>} className="h-full">
      <div className="rounded-lg bg-surface2 p-3">
        <div className="text-sm font-semibold">{decision.action}</div>
        <p className="mt-1 text-xs text-muted leading-relaxed">{decision.reason}</p>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
          Confidence <Bar value={decision.confidence} className="w-24" /> {decision.confidence}%
        </div>
      </div>
      {faults.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {faults.map(f => <Pill key={f.id} tone="crit">Fault: {f.id.replace('_', ' ')}</Pill>)}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="label">Open alerts</span>
        <Link to="/early-warning" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
      </div>
      <div className="mt-2 space-y-2">
        {open.length === 0 ? <Empty>No open alerts. Grid within limits.</Empty> : open.map(a => (
          <div key={a.id} className="flex items-start gap-2 rounded-lg border border-line p-2.5">
            <SeverityBadge severity={a.severity} />
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{a.title}</div>
              <div className="text-[11px] text-muted truncate">{a.asset}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setCopilot(true)} className="btn-ghost w-full mt-4"><Bot size={15} /> Ask DARPAN Copilot</button>
    </Card>
  );
}

function StorageSummary() {
  const storage = useGrid(s => s.snap.storage);
  return (
    <Card title="Hybrid storage" subtitle="SoC and power per technology" action={<Link to="/storage" className="text-xs text-primary hover:underline">Details</Link>}>
      <div className="space-y-3">
        {STORAGE.map(def => {
          const st = storage.find(x => x.id === def.id)!;
          return (
            <div key={def.id}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{def.name}</span>
                <span className={cx('num', st.mode === 'Charging' ? 'text-ok' : st.mode === 'Discharging' ? 'text-warn' : st.mode === 'Derated' ? 'text-crit' : 'text-muted')}>
                  {st.soc.toFixed(0)}% · {st.power > 0 ? '+' : ''}{fmt(st.power)} MW
                </span>
              </div>
              <Bar value={st.soc} color={def.color} className="mt-1.5" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function GridHealth() {
  const s = useGrid(st => st.snap);
  const rows = [
    ['Frequency', `${s.frequency.toFixed(3)} Hz`, s.telemetryOk && s.frequency >= 49.9 && s.frequency <= 50.05],
    ['HVAC bus', `${s.hvac.voltageKV.toFixed(1)} kV`, s.hvac.voltageKV >= 380 && s.hvac.voltageKV <= 420],
    ['HVDC link', s.hvdc.online ? `±${s.hvdc.voltageKV.toFixed(0)} kV` : 'Tripped', s.hvdc.online],
    ['HVAC loading', `${(s.hvac.loading * 100).toFixed(0)}%`, s.hvac.loading < 0.85],
    ['Losses', `${fmt(s.hvac.losses + s.hvdc.losses)} MW`, true],
    ['Curtailment', `${fmt(s.curtailed)} MW`, s.curtailed < 100],
    ['Unserved load', `${fmt(s.unserved)} MW`, s.unserved < 1],
  ] as const;
  return (
    <Card title="Grid health" action={<Link to="/grid" className="text-xs text-primary hover:underline">Details</Link>}>
      <dl className="divide-y divide-line">
        {rows.map(([k, v, ok]) => (
          <div key={k} className="flex items-center justify-between py-2 text-sm">
            <dt className="text-muted text-xs">{k}</dt>
            <dd className={cx('num font-medium flex items-center gap-1.5', ok ? 'text-fg' : 'text-crit')}>
              <span className={cx('h-1.5 w-1.5 rounded-full', ok ? 'bg-ok' : 'bg-crit pulse-dot')} />{v}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function CommandCenter() {
  return (
    <div className="space-y-3 sm:space-y-4 fade-up">
      <KPIs />
      <Card title="Live energy flow" subtitle="Generation → AI Control → Transmission → Storage & Distribution → Receivers" action={<span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] text-ok"><span className="h-1.5 w-1.5 rounded-full bg-ok pulse-dot" />Live · 3 s</span>}>
        <EnergyFlow />
      </Card>
      <div className="grid gap-3 sm:gap-4 xl:grid-cols-3">
        <Card title="Generation mix" subtitle="Stacked output by source vs demand (last 24 h, sim time)" className="xl:col-span-2">
          <GenerationMixChart height={300} />
        </Card>
        <AIPanel />
      </div>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Duck curve" subtitle="Net load = demand − solar − wind" className="md:col-span-2">
          <DuckCurveChart height={280} />
        </Card>
        <StorageSummary />
        <GridHealth />
      </div>
    </div>
  );
}
