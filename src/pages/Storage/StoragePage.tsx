import { useGrid } from '../../store/gridStore';
import { STORAGE } from '../../sim/model';
import { StorageSocChart, StoragePowerChart } from '../../components/charts/GridCharts';
import { Card, Stat, Bar, Pill, PageHeader, fmt, cx } from '../../components/ui/kit';

export default function StoragePage() {
  const storage = useGrid(s => s.snap.storage);
  const net = useGrid(s => s.snap.storageNet);
  const isPeak = useGrid(s => s.snap.isPeak);

  const totalEnergy = STORAGE.reduce((a, d) => a + d.energy, 0);
  const stored = STORAGE.reduce((a, d) => a + (storage.find(x => x.id === d.id)!.soc / 100) * d.energy, 0);
  const usable = STORAGE.reduce((a, d) => a + Math.max(0, (storage.find(x => x.id === d.id)!.soc - d.reserve) / 100) * d.energy, 0);
  const totalPower = STORAGE.reduce((a, d) => a + d.power, 0);

  return (
    <div className="fade-up">
      <PageHeader title="Hybrid Storage" subtitle="Charge at low demand / surplus, discharge at peak or emergency" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Energy stored" value={fmt(stored)} unit={`/ ${fmt(totalEnergy)} MWh`} />
        <Stat label="Usable above reserve" value={fmt(usable)} unit="MWh" tone={usable < 1000 ? 'warn' : 'fg'} />
        <Stat label="Net power" value={`${net > 0 ? '+' : ''}${fmt(net)}`} unit="MW" tone={net > 1 ? 'ok' : net < -1 ? 'warn' : 'fg'} hint={net > 1 ? 'Charging' : net < -1 ? 'Discharging' : 'Holding'} />
        <Stat label="Fleet power rating" value={fmt(totalPower)} unit="MW" hint={isPeak ? 'Peak window: discharge priority' : 'Off-peak: charge priority'} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 mb-4">
        {STORAGE.map(def => {
          const st = storage.find(x => x.id === def.id)!;
          const tone = st.mode === 'Charging' ? 'ok' : st.mode === 'Discharging' ? 'warn' : st.mode === 'Derated' ? 'crit' : 'muted';
          return (
            <div key={def.id} className={cx('card p-4', st.mode === 'Derated' && 'border-crit/50')}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{def.name}</span>
                <Pill tone={tone}>{st.mode}</Pill>
              </div>
              <p className="mt-1 text-[11px] text-muted min-h-[2rem]">{def.role}</p>
              <div className="mt-3 flex items-end gap-3">
                {/* vertical SoC gauge */}
                <div className="relative h-24 w-10 rounded-md border border-line bg-surface2 overflow-hidden">
                  <div className="absolute bottom-0 inset-x-0 transition-[height] duration-700" style={{ height: `${st.soc}%`, background: def.color, opacity: 0.85 }} />
                  <div className="absolute inset-x-0 border-t border-dashed border-crit/70" style={{ bottom: `${def.reserve}%` }} title="Reserve" />
                </div>
                <div className="flex-1 space-y-1 text-xs">
                  <div className="font-display text-2xl font-semibold num">{st.soc.toFixed(1)}%</div>
                  <div className="flex justify-between"><span className="text-muted">Power</span><span className="num">{st.power > 0 ? '+' : ''}{fmt(st.power)} MW</span></div>
                  <div className="flex justify-between"><span className="text-muted">Temp</span><span className={cx('num', def.id === 'liion' && st.temp > 42 && 'text-crit font-semibold')}>{st.temp.toFixed(0)} °C</span></div>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-1 text-[10px] text-muted border-t border-line pt-2">
                <div><dt>Energy</dt><dd className="text-fg num">{fmt(def.energy)} MWh</dd></div>
                <div><dt>Power</dt><dd className="text-fg num">{def.power} MW</dd></div>
                <div><dt>Round-trip</dt><dd className="text-fg num">{(def.eff * 100).toFixed(0)}%</dd></div>
              </dl>
              <Bar value={Math.abs(st.power) / def.power * 100} color={def.color} className="mt-2 h-1" />
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="State of charge" subtitle="Per technology, last 24 h (sim time)"><StorageSocChart height={280} /></Card>
        <Card title="Charge / discharge vs net load" subtitle="Storage absorbs the midday belly and serves the evening neck of the duck curve"><StoragePowerChart height={280} /></Card>
      </div>
    </div>
  );
}
