import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, CheckCircle2, Eye, Zap, RotateCcw, Lock, Cpu } from 'lucide-react';
import { useGrid } from '../../store/gridStore';
import { useAuth } from '../../auth/AuthContext';
import { FAULTS, expectedDemand, expectedSolar } from '../../sim/model';
import { severityRank, anomalyScore, type Severity } from '../../sim/alerts';
import { fetchAnomaly, ML_ENABLED } from '../../lib/mlClient';
import { Card, Stat, Bar, Pill, PageHeader, SeverityBadge, StatusBadge, Empty, fmtTime, cx } from '../../components/ui/kit';

type StatusFilter = 'open' | 'all' | 'resolved';

function FaultPanel() {
  const { can } = useAuth();
  const allowed = can('inject_faults');
  const faults = useGrid(s => s.snap.faults);
  const inject = useGrid(s => s.injectFault);
  const clear = useGrid(s => s.clearFaults);
  const reset = useGrid(s => s.reset);
  return (
    <Card title="Scenario & fault injection" subtitle="Stress-test the AI control and early-warning layer"
      action={!allowed && <Pill><Lock size={11} /> Admin only</Pill>}>
      <div className="grid grid-cols-2 gap-2">
        {FAULTS.map(f => {
          const active = faults.find(x => x.id === f.id);
          return (
            <button key={f.id} disabled={!allowed} onClick={() => inject(f.id)} title={f.description}
              className={cx('rounded-lg border p-2.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                active ? 'border-crit/60 bg-crit/10' : 'border-line hover:border-primary/50 hover:bg-surface2')}>
              <div className="flex items-center gap-1.5 text-xs font-semibold"><Zap size={12} className={active ? 'text-crit' : 'text-muted'} />{f.label}</div>
              <div className="mt-0.5 text-[10px] text-muted leading-snug">{active ? `Active · ${active.ticksLeft} ticks left` : f.description}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <button disabled={!allowed || faults.length === 0} onClick={clear} className="btn-ghost flex-1">Clear faults</button>
        <button disabled={!allowed} onClick={reset} className="btn-ghost flex-1"><RotateCcw size={14} /> Reset sim</button>
      </div>
    </Card>
  );
}

function AnomalyScorePanel() {
  const s = useGrid(st => st.snap);
  const tick = useGrid(st => st.tick);
  const features = useMemo(() => {
    const expD = expectedDemand(s.simTime), expS = expectedSolar(s.simTime);
    return {
      frequency: s.frequency, voltage_kv: s.hvac.voltageKV,
      demand_residual_pct: ((s.demand - expD) / expD) * 100,
      solar_residual_pct: expS > 50 ? ((s.gen.solar - expS) / expS) * 100 : 0,
      hvac_loading: s.hvac.loading,
    };
  }, [s]);
  // Client-side fallback: worst standardised residual → Isolation-Forest-style score
  const z = Math.max(Math.abs(features.frequency - 50) / 0.04, Math.abs(features.voltage_kv - 400) / 6, Math.abs(features.demand_residual_pct) / 2.5, features.solar_residual_pct < 0 ? -features.solar_residual_pct / 12 : 0);
  const clientScore = anomalyScore(z);
  const [ml, setMl] = useState<{ score: number; model: string } | null>(null);

  useEffect(() => {
    if (!ML_ENABLED || tick % 3 !== 0) return;
    let cancelled = false;
    fetchAnomaly(features).then(r => { if (!cancelled) setMl(r); });
    return () => { cancelled = true; };
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const score = ml?.score ?? clientScore;
  const tone = score > 0.7 ? 'crit' : score > 0.45 ? 'warn' : 'ok';
  return (
    <Card title="Live anomaly score" subtitle={ml ? `${ml.model} · ML service` : 'Isolation-Forest-style score · client fallback'} action={<Cpu size={16} className="text-muted" />}>
      <div className="flex items-end gap-2">
        <span className={cx('font-display text-4xl font-semibold num', `text-${tone}`)}>{score.toFixed(2)}</span>
        <span className="text-xs text-muted mb-1.5">0 normal → 1 anomalous</span>
      </div>
      <Bar value={score * 100} color={`rgb(var(--${tone}))`} className="mt-2 h-2" />
      <dl className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
        {[
          ['Frequency', `${features.frequency.toFixed(3)} Hz`],
          ['Voltage', `${features.voltage_kv.toFixed(1)} kV`],
          ['Demand residual', `${features.demand_residual_pct.toFixed(1)}%`],
          ['Solar residual', `${features.solar_residual_pct.toFixed(1)}%`],
        ].map(([k, v]) => <div key={k} className="flex justify-between rounded bg-surface2 px-2 py-1"><dt className="text-muted">{k}</dt><dd className="num">{v}</dd></div>)}
      </dl>
    </Card>
  );
}

export default function EarlyWarningPage() {
  const alerts = useGrid(s => s.alerts);
  const acknowledge = useGrid(s => s.acknowledge);
  const resolve = useGrid(s => s.resolve);
  const { session, can } = useAuth();
  const [status, setStatus] = useState<StatusFilter>('open');
  const [sev, setSev] = useState<Severity | 'all'>('all');

  const counts = {
    active: alerts.filter(a => a.status === 'active').length,
    ack: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    critical: alerts.filter(a => a.status !== 'resolved' && a.severity === 'critical').length,
  };

  const list = alerts
    .filter(a => (status === 'all' ? true : status === 'open' ? a.status !== 'resolved' : a.status === 'resolved'))
    .filter(a => (sev === 'all' ? true : a.severity === sev))
    .sort((a, b) => (a.status === 'resolved') === (b.status === 'resolved') ? severityRank(b.severity) - severityRank(a.severity) || b.raisedAt - a.raisedAt : a.status === 'resolved' ? 1 : -1);

  const who = session ? `${session.name} (${session.role})` : 'operator';

  return (
    <div className="fade-up">
      <PageHeader title="Early Warning & Anomalies" subtitle="Predictive warnings, anomaly detection and protection events with operator workflow" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Active" icon={<ShieldAlert size={13} />} value={counts.active} tone={counts.active ? 'crit' : 'ok'} />
        <Stat label="Acknowledged" icon={<Eye size={13} />} value={counts.ack} tone={counts.ack ? 'warn' : 'fg'} />
        <Stat label="Critical open" value={counts.critical} tone={counts.critical ? 'crit' : 'fg'} />
        <Stat label="Resolved" icon={<CheckCircle2 size={13} />} value={counts.resolved} tone="ok" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-line p-0.5 bg-surface">
              {(['open', 'all', 'resolved'] as StatusFilter[]).map(f => (
                <button key={f} onClick={() => setStatus(f)} className={cx('rounded-md px-3 py-1 text-xs font-medium capitalize', status === f ? 'bg-primary/15 text-primary' : 'text-muted hover:text-fg')}>{f}</button>
              ))}
            </div>
            <select value={sev} onChange={e => setSev(e.target.value as Severity | 'all')} className="input w-auto py-1 text-xs" aria-label="Filter by severity">
              <option value="all">All severities</option>
              {(['critical', 'high', 'medium', 'low'] as Severity[]).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
            <span className="text-xs text-muted ml-auto">{list.length} alert{list.length === 1 ? '' : 's'}</span>
          </div>

          {list.length === 0 && (
            <Empty>
              {status === 'open' ? 'No open alerts: the grid is operating within limits. Admins can inject a fault scenario to see the early-warning flow.' : 'No alerts match this filter.'}
            </Empty>
          )}

          {list.map(a => (
            <article key={a.id} className={cx('card p-4 fade-up border-l-4', a.status === 'resolved' ? 'border-l-ok/60 opacity-75' : a.severity === 'critical' || a.severity === 'high' ? 'border-l-crit' : a.severity === 'medium' ? 'border-l-warn' : 'border-l-info')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <h3 className="text-sm font-semibold">{a.title}</h3>
                    <Pill>{a.category}</Pill>
                  </div>
                  <div className="mt-1 text-xs text-muted">{a.asset} · raised {fmtTime(a.raisedAt)} (grid time {fmtTime(a.simAt)}){a.cleared && a.status !== 'resolved' ? ' · condition cleared' : ''}</div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <p className="mt-2 text-sm">{a.message}</p>
              <div className="mt-2 rounded-lg bg-surface2 p-2.5 text-xs">
                <span className="font-semibold text-primary">Recommended action: </span>{a.recommendation}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-[11px] text-muted whitespace-nowrap">Anomaly score <Bar value={a.score * 100} className="w-20" color={a.score > 0.7 ? 'rgb(var(--crit))' : 'rgb(var(--warn))'} /> <span className="num">{a.score.toFixed(2)}</span></div>
                <div className="ml-auto flex gap-2">
                  {a.status === 'active' && can('acknowledge') && <button onClick={() => acknowledge(a.id, who)} className="btn-ghost py-1 text-xs"><Eye size={13} /> Acknowledge</button>}
                  {a.status !== 'resolved' && can('resolve') && <button onClick={() => resolve(a.id, who)} className="btn-primary py-1 text-xs"><CheckCircle2 size={13} /> Resolve</button>}
                </div>
              </div>
              {(a.ackBy || a.resolvedBy) && (
                <div className="mt-2 text-[11px] text-muted">
                  {a.ackBy && <>Acknowledged by {a.ackBy}. </>}
                  {a.resolvedBy && <>Resolved by {a.resolvedBy}{a.resolvedAt ? ` at ${fmtTime(a.resolvedAt)}` : ''}.</>}
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="space-y-4">
          <FaultPanel />
          <AnomalyScorePanel />
        </div>
      </div>
    </div>
  );
}
