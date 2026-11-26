import { useMemo } from 'react';
import { Sun, Activity, TrendingUp, Cpu } from 'lucide-react';
import { useGrid } from '../../store/gridStore';
import { useForecast } from '../../lib/useForecast';
import { windMW, meanWind, hourOf } from '../../sim/model';
import { ForecastChart } from '../../components/charts/GridCharts';
import { Card, Stat, Pill, PageHeader, fmt, fmtTime, cx } from '../../components/ui/kit';

function SourceBadge({ source, mlStatus }: { source: 'ml' | 'client'; mlStatus: string }) {
  if (source === 'ml') return <Pill tone="ok"><Cpu size={11} /> ML service online</Pill>;
  if (mlStatus === 'disabled') return <Pill><Cpu size={11} /> Client-side model (ML service not configured)</Pill>;
  if (mlStatus === 'loading') return <Pill><Cpu size={11} /> Connecting to ML service…</Pill>;
  return <Pill tone="warn"><Cpu size={11} /> ML service offline: using client-side model</Pill>;
}

export default function ForecastPage() {
  const history = useGrid(s => s.history);
  const { solar, demand, source, models, metrics, mlStatus } = useForecast();

  // Last 12 h of actuals, sampled every 30 sim-minutes
  const actual = useMemo(() => {
    if (!history.length) return { solar: [], demand: [] };
    const end = history[history.length - 1].t;
    const pts = history.filter(p => p.t >= end - 12 * 3600_000);
    const sampled = pts.filter((p, i) => i === pts.length - 1 || Math.floor(p.t / 1800_000) !== Math.floor((pts[i + 1]?.t ?? 0) / 1800_000));
    return { solar: sampled.map(p => ({ t: p.t, v: p.solar })), demand: sampled.map(p => ({ t: p.t, v: p.demand })) };
  }, [history]);

  const peakSolar = solar.reduce((a, b) => (b.value > a.value ? b : a), solar[0]);
  const peakDemand = demand.reduce((a, b) => (b.value > a.value ? b : a), demand[0]);
  const net = demand.map((d, i) => ({ t: d.t, net: d.value - solar[i].value - windMW(meanWind(hourOf(d.t))), demand: d.value, solar: solar[i].value }));
  let maxRamp = 0, rampAt = net[0]?.t ?? 0;
  for (let i = 6; i < net.length; i++) { const r = net[i].net - net[i - 6].net; if (r > maxRamp) { maxRamp = r; rampAt = net[i].t; } }
  const minNet = Math.min(...net.map(n => n.net));
  const plan = net.filter((_, i) => i % 2 === 1).slice(0, 12).map(n => {
    const h = hourOf(n.t);
    const action = n.net < minNet + 250 ? ['Charge storage', 'ok'] : h >= 17.5 && h < 23 ? ['Discharge storage', 'warn'] : h < 5.5 ? ['Night charge (pumped hydro)', 'primary'] : ['Hold / ramp thermal', 'muted'];
    return { ...n, action: action[0], tone: action[1] as 'ok' | 'warn' | 'primary' | 'muted' };
  });

  return (
    <div className="fade-up">
      <PageHeader title="Forecasting" subtitle="24 h solar generation and demand forecasts with 90% confidence intervals" actions={<SourceBadge source={source} mlStatus={mlStatus} />} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Solar next hour" icon={<Sun size={13} />} value={fmt(solar[1]?.value ?? 0)} unit="MW" hint={`± ${fmt(((solar[1]?.upper ?? 0) - (solar[1]?.lower ?? 0)) / 2)} MW`} />
        <Stat label="Peak solar" icon={<Sun size={13} />} value={fmt(peakSolar?.value ?? 0)} unit="MW" hint={peakSolar ? `at ${fmtTime(peakSolar.t)}` : ''} />
        <Stat label="Peak demand" icon={<Activity size={13} />} value={fmt(peakDemand?.value ?? 0)} unit="MW" hint={peakDemand ? `at ${fmtTime(peakDemand.t)}` : ''} />
        <Stat label="Max 3 h net-load ramp" icon={<TrendingUp size={13} />} value={`+${fmt(maxRamp)}`} unit="MW" tone={maxRamp > 900 ? 'warn' : 'fg'} hint={`ending ${fmtTime(rampAt)}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2 mb-4">
        <Card title="Solar generation forecast" subtitle={`Model: ${models.solar}`}><ForecastChart forecast={solar} actual={actual.solar} color="#F5A524" height={300} /></Card>
        <Card title="Demand forecast" subtitle={`Model: ${models.demand}`}><ForecastChart forecast={demand} actual={actual.demand} color="#38BDF8" height={300} /></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="AI dispatch plan" subtitle="Next 12 h, derived from the net-load forecast (advisory)" className="xl:col-span-2">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-line">
                  <th className="py-2 pr-3 font-medium">Time</th><th className="py-2 pr-3 font-medium text-right">Demand</th>
                  <th className="py-2 pr-3 font-medium text-right">Solar</th><th className="py-2 pr-3 font-medium text-right">Net load</th><th className="py-2 font-medium">Recommended</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {plan.map(p => (
                  <tr key={p.t}>
                    <td className="py-2 pr-3 font-mono text-xs">{fmtTime(p.t)}</td>
                    <td className="py-2 pr-3 text-right num">{fmt(p.demand)}</td>
                    <td className="py-2 pr-3 text-right num">{fmt(p.solar)}</td>
                    <td className={cx('py-2 pr-3 text-right num font-medium', p.net > 1900 && 'text-warn')}>{fmt(p.net)}</td>
                    <td className="py-2"><Pill tone={p.tone}>{p.action}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Model card">
          <dl className="space-y-3 text-sm">
            <div><dt className="label">Solar</dt><dd className="mt-0.5">{models.solar}</dd></div>
            <div><dt className="label">Demand</dt><dd className="mt-0.5">{models.demand}</dd></div>
            <div><dt className="label">Anomaly detection</dt><dd className="mt-0.5">{source === 'ml' ? 'IsolationForest (ML service)' : 'Residual z-score, Isolation-Forest-style scoring (client)'}</dd></div>
            <div><dt className="label">Features</dt><dd className="mt-0.5 text-muted text-xs">Hour of day & day of year (sin/cos), day of week, temperature, cloud cover, clear-sky index</dd></div>
            <div><dt className="label">Training data</dt><dd className="mt-0.5 text-muted text-xs">Synthetic: 1 year of hourly telemetry generated from the DARPAN grid model with weather noise</dd></div>
            {metrics && (
              <div>
                <dt className="label">Validation metrics</dt>
                <dd className="mt-1 grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(metrics).map(([k, v]) => <div key={k} className="flex justify-between rounded bg-surface2 px-2 py-1"><span className="text-muted">{k}</span><span className="num">{v}</span></div>)}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>
    </div>
  );
}
