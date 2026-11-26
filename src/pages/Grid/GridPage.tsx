import { Gauge, Zap, Cable, ArrowLeftRight, Flame } from 'lucide-react';
import { useGrid } from '../../store/gridStore';
import { HVAC_CAP, HVDC_CAP, TIE_CAP } from '../../sim/model';
import { FrequencyChart, VoltageChart } from '../../components/charts/GridCharts';
import { Card, Stat, Bar, Pill, PageHeader, fmt, cx } from '../../components/ui/kit';

function PMUTable() {
  const s = useGrid(st => st.snap);
  // Simulated synchrophasor readings derived from corridor loading (angle spread grows with flow).
  const pmus = [
    { id: 'PMU-01', site: 'RE zone converter (rectifier)', kv: s.hvac.voltageKV * 1.004, angle: 0 },
    { id: 'PMU-04', site: 'HVAC corridor midpoint', kv: s.hvac.voltageKV * 0.997, angle: -12 * s.hvac.loading },
    { id: 'PMU-07', site: 'Load-centre 400 kV bus', kv: s.hvac.voltageKV, angle: -24 * s.hvac.loading, stale: !s.telemetryOk },
    { id: 'PMU-09', site: 'Inverter station (HVDC)', kv: s.hvdc.online ? s.hvac.voltageKV * 1.002 : 0, angle: s.hvdc.online ? -6 : 0, stale: !s.hvdc.online },
  ];
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full text-sm min-w-[520px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-line">
            <th className="py-2 pr-3 font-medium">Unit</th><th className="py-2 pr-3 font-medium">Location</th>
            <th className="py-2 pr-3 font-medium text-right">|V| kV</th><th className="py-2 pr-3 font-medium text-right">Angle</th>
            <th className="py-2 pr-3 font-medium text-right">f (Hz)</th><th className="py-2 font-medium">Time sync</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {pmus.map(p => (
            <tr key={p.id} className={cx(p.stale && 'text-muted')}>
              <td className="py-2 pr-3 font-mono text-xs">{p.id}</td>
              <td className="py-2 pr-3 text-xs">{p.site}</td>
              <td className="py-2 pr-3 text-right num">{p.stale ? '—' : p.kv.toFixed(1)}</td>
              <td className="py-2 pr-3 text-right num">{p.stale ? '—' : `${p.angle.toFixed(1)}°`}</td>
              <td className="py-2 pr-3 text-right num">{p.stale ? '—' : s.frequency.toFixed(3)}</td>
              <td className="py-2">{p.stale ? <Pill tone="crit">No data</Pill> : <Pill tone="ok">GPS + atomic ±100 ns</Pill>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GridPage() {
  const s = useGrid(st => st.snap);
  const hvdcLossPct = s.hvdc.flow > 0 ? (s.hvdc.losses / s.hvdc.flow) * 100 : 0;
  const hvacLossPct = s.hvac.flow > 0 ? (s.hvac.losses / s.hvac.flow) * 100 : 0;
  const fBad = s.frequency < 49.9 || s.frequency > 50.05;

  const links = [
    { name: '±800 kV HVDC link', role: 'Bulk RE transfer from remote solar/wind zone', flow: s.hvdc.flow, cap: HVDC_CAP, kv: s.hvdc.online ? `±${s.hvdc.voltageKV.toFixed(0)} kV` : 'Offline', loss: hvdcLossPct, online: s.hvdc.online, color: '#22D3EE' },
    { name: '400 kV HVAC corridor', role: 'Meshed AC network to load centres', flow: s.hvac.flow, cap: HVAC_CAP, kv: `${s.hvac.voltageKV.toFixed(1)} kV`, loss: hvacLossPct, online: true, color: '#A78BFA' },
    { name: 'Inter-regional tie', role: s.tieFlow > 1 ? 'Importing from neighbouring region' : s.tieFlow < -1 ? 'Exporting surplus' : 'Standby', flow: Math.abs(s.tieFlow), cap: TIE_CAP, kv: '400 kV', loss: 3, online: true, color: '#94A3B8' },
  ];

  return (
    <div className="fade-up">
      <PageHeader title="Grid & Transmission" subtitle="Hybrid HVAC + HVDC smart transmission with synchronized PMU monitoring" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Stat label="Frequency" icon={<Gauge size={13} />} value={s.frequency.toFixed(3)} unit="Hz" tone={!s.telemetryOk ? 'warn' : fBad ? 'crit' : 'ok'} hint={s.telemetryOk ? 'IEGC 49.90–50.05' : 'Telemetry stale'} />
        <Stat label="HVAC bus" icon={<Zap size={13} />} value={s.hvac.voltageKV.toFixed(1)} unit="kV" tone={s.hvac.voltageKV < 380 ? 'crit' : 'fg'} />
        <Stat label="HVDC flow" icon={<Cable size={13} />} value={s.hvdc.online ? fmt(s.hvdc.flow) : 'TRIP'} unit={s.hvdc.online ? 'MW' : ''} tone={s.hvdc.online ? 'fg' : 'crit'} />
        <Stat label="Tie line" icon={<ArrowLeftRight size={13} />} value={fmt(Math.abs(s.tieFlow))} unit="MW" hint={s.tieFlow > 1 ? 'Import' : s.tieFlow < -1 ? 'Export' : 'Idle'} />
        <Stat label="Losses" icon={<Flame size={13} />} value={fmt(s.hvac.losses + s.hvdc.losses)} unit="MW" hint={`${(((s.hvac.losses + s.hvdc.losses) / Math.max(1, s.totalGen)) * 100).toFixed(1)}% of generation`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2 mb-4">
        <Card title="System frequency" subtitle="Green band: IEGC operating range"><FrequencyChart height={230} /></Card>
        <Card title="400 kV bus voltage" subtitle="Dashed: ±5% limits"><VoltageChart height={230} /></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card title="Transmission links" subtitle="HVDC carries bulk renewables with lower losses per MW" className="xl:col-span-2">
          <div className="space-y-4">
            {links.map(l => (
              <div key={l.name}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: l.color }} />{l.name}</div>
                    <div className="text-[11px] text-muted">{l.role}</div>
                  </div>
                  {l.online ? <Pill tone="ok">{l.kv}</Pill> : <Pill tone="crit">Tripped</Pill>}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted"><span className="num">{fmt(l.flow)} / {fmt(l.cap)} MW</span><span className="num">loss {l.loss.toFixed(1)}%</span></div>
                <Bar value={(l.flow / l.cap) * 100} color={l.flow / l.cap > 0.85 ? 'rgb(var(--crit))' : l.color} className="mt-1" />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Synchrophasor snapshot" subtitle="PMU + TSN monitoring (simulated, design level)" className="xl:col-span-3"><PMUTable /></Card>
      </div>
    </div>
  );
}
