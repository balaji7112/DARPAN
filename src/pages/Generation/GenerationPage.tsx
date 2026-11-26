import { Sun, Wind, Thermometer, Cloud } from 'lucide-react';
import { useGrid } from '../../store/gridStore';
import { SOURCES } from '../../sim/model';
import { GenerationMixChart, MixDonut } from '../../components/charts/GridCharts';
import { Card, Stat, Bar, Pill, PageHeader, fmt } from '../../components/ui/kit';

export default function GenerationPage() {
  const gen = useGrid(s => s.snap.gen);
  const weather = useGrid(s => s.snap.weather);
  const today = useGrid(s => s.snap.today);
  const total = Object.values(gen).reduce((a, b) => a + b, 0);

  return (
    <div className="fade-up">
      <PageHeader title="Generation" subtitle="Everything-Grid: renewable and conventional sources in one dispatch" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Irradiance" icon={<Sun size={13} />} value={fmt(weather.irradiance)} unit="W/m²" />
        <Stat label="Cloud cover" icon={<Cloud size={13} />} value={(weather.cloud * 100).toFixed(0)} unit="%" tone={weather.cloud > 0.6 ? 'warn' : 'fg'} />
        <Stat label="Wind speed" icon={<Wind size={13} />} value={weather.windSpeed.toFixed(1)} unit="m/s" />
        <Stat label="Ambient" icon={<Thermometer size={13} />} value={weather.tempC.toFixed(1)} unit="°C" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        {SOURCES.map(src => {
          const mw = gen[src.id];
          const cf = (mw / src.capacity) * 100;
          return (
            <div key={src.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: src.color }} />
                    <span className="text-sm font-semibold">{src.name}</span>
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    <Pill>{src.kind}</Pill>
                    {src.renewable ? <Pill tone="ok">Renewable</Pill> : <Pill>Conventional</Pill>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl font-semibold num">{fmt(mw)}</div>
                  <div className="text-[11px] text-muted">of {fmt(src.capacity)} MW</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted"><span>Capacity factor</span><span className="num">{cf.toFixed(0)}%</span></div>
              <Bar value={cf} color={src.color} className="mt-1" />
              <div className="mt-2 text-[11px] text-muted">{((mw / total) * 100).toFixed(1)}% of current supply</div>
            </div>
          );
        })}
        <div className="card p-4">
          <div className="text-sm font-semibold">Today so far</div>
          <dl className="mt-2 space-y-1.5 text-xs">
            {[
              ['Demand served', `${fmt(today.demandMWh)} MWh`],
              ['Renewable energy', `${fmt(today.renewableMWh)} MWh`],
              ['Curtailed', `${fmt(today.curtailedMWh)} MWh`],
              ['Imported', `${fmt(today.importMWh)} MWh`],
              ['Exported', `${fmt(today.exportMWh)} MWh`],
            ].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="num font-medium">{v}</dd></div>)}
          </dl>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Output by source" subtitle="Last 24 h (sim time)" className="xl:col-span-2"><GenerationMixChart height={320} /></Card>
        <Card title="Current mix" subtitle={`${fmt(total)} MW total`}>
          <MixDonut height={220} />
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {SOURCES.map(s => (
              <div key={s.id} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                <span className="text-muted truncate">{s.name}</span>
                <span className="ml-auto num">{((gen[s.id] / total) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
