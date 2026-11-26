import { useMemo } from 'react';
import EChart, { useChartTheme, baseOption, axisStyle } from './EChart';
import { useGrid } from '../../store/gridStore';
import { SOURCES, STORAGE, dayProfile, type ForecastPoint } from '../../sim/model';
import { fmtTime } from '../ui/kit';

const hhmm = (t: number) => fmtTime(t);

/** Stacked generation by source with demand overlay (last 24 h of sim time). */
export function GenerationMixChart({ height = 260 }: { height?: number }) {
  const history = useGrid(s => s.history);
  const t = useChartTheme();
  const option = useMemo(() => {
    const order = ['nuclear', 'geothermal', 'biomass', 'hydro', 'thermal', 'wind', 'solar'] as const;
    return {
      ...baseOption(t),
      xAxis: { type: 'category', boundaryGap: false, data: history.map(p => hhmm(p.t)), ...axisStyle(t), splitLine: { show: false } },
      yAxis: { type: 'value', ...axisStyle(t) },
      series: [
        ...order.map(id => {
          const src = SOURCES.find(s => s.id === id)!;
          return {
            name: src.name, type: 'line', stack: 'gen', symbol: 'none', smooth: true,
            lineStyle: { width: 0 }, areaStyle: { color: src.color, opacity: 0.85 }, itemStyle: { color: src.color },
            data: history.map(p => p[id]),
          };
        }),
        { name: 'Storage discharge', type: 'line', stack: 'gen', symbol: 'none', smooth: true, lineStyle: { width: 0 }, areaStyle: { color: '#34D399', opacity: 0.85 }, itemStyle: { color: '#34D399' }, data: history.map(p => Math.max(0, -p.storageNet)) },
        { name: 'Import', type: 'line', stack: 'gen', symbol: 'none', smooth: true, lineStyle: { width: 0 }, areaStyle: { color: '#E879F9', opacity: 0.8 }, itemStyle: { color: '#E879F9' }, data: history.map(p => Math.max(0, p.tie)) },
        { name: 'Demand', type: 'line', symbol: 'none', smooth: true, data: history.map(p => p.demand), lineStyle: { color: t.text, width: 2, type: 'dashed' }, itemStyle: { color: t.text } },
      ],
      tooltip: { ...baseOption(t).tooltip, valueFormatter: (v: number) => `${Math.round(v)} MW` },
      legend: { ...baseOption(t).legend, type: 'scroll' },
    };
  }, [history, t]);
  return <EChart option={option} height={height} />;
}

/** Duck curve: expected demand vs net load (demand − solar − wind) with today's actual net load. */
export function DuckCurveChart({ height = 260 }: { height?: number }) {
  const simTime = useGrid(s => s.snap.simTime);
  const hour = useGrid(s => s.snap.hour);
  const history = useGrid(s => s.history);
  const t = useChartTheme();
  const day = new Date(simTime).toDateString();
  const profile = useMemo(() => dayProfile(simTime), [day]); // eslint-disable-line react-hooks/exhaustive-deps
  const option = useMemo(() => {
    const dayStart = new Date(simTime); dayStart.setHours(0, 0, 0, 0);
    const actual = history.filter(p => p.t >= dayStart.getTime()).map(p => [(p.t - dayStart.getTime()) / 3600_000, p.net]);
    return {
      ...baseOption(t),
      xAxis: { type: 'value', min: 0, max: 24, interval: 3, ...axisStyle(t), axisLabel: { color: t.muted, fontSize: 10, formatter: (v: number) => `${String(v).padStart(2, '0')}:00` }, splitLine: { show: false } },
      yAxis: { type: 'value', ...axisStyle(t) },
      tooltip: { ...baseOption(t).tooltip, valueFormatter: (v: number) => `${Math.round(v)} MW` },
      series: [
        { name: 'Demand (expected)', type: 'line', symbol: 'none', smooth: true, data: profile.map(p => [p.h, p.demand]), lineStyle: { color: '#94A3B8', width: 2 }, itemStyle: { color: '#94A3B8' } },
        { name: 'Solar', type: 'line', symbol: 'none', smooth: true, data: profile.map(p => [p.h, p.solar]), lineStyle: { color: '#F5A524', width: 1.5 }, areaStyle: { color: '#F5A524', opacity: 0.12 }, itemStyle: { color: '#F5A524' } },
        {
          name: 'Net load (duck)', type: 'line', symbol: 'none', smooth: true, data: profile.map(p => [p.h, p.net]),
          lineStyle: { color: '#38BDF8', width: 2.5 }, itemStyle: { color: '#38BDF8' },
          markLine: { symbol: 'none', silent: true, lineStyle: { color: t.muted, type: 'dotted' }, label: { color: t.muted, fontSize: 10, formatter: 'now' }, data: [{ xAxis: Math.round(hour * 100) / 100 }] },
          markArea: { silent: true, itemStyle: { color: 'rgba(248,113,113,0.07)' }, label: { color: t.muted, fontSize: 10, position: 'insideTop' }, data: [[{ xAxis: 17.5, name: 'Peak' }, { xAxis: 23 }]] },
        },
        { name: 'Net load (actual)', type: 'line', symbol: 'none', data: actual, lineStyle: { color: '#34D399', width: 2 }, itemStyle: { color: '#34D399' } },
      ],
    };
  }, [profile, history, hour, simTime, t]);
  return <EChart option={option} height={height} />;
}

/** System frequency with IEGC operating band. */
export function FrequencyChart({ height = 200 }: { height?: number }) {
  const history = useGrid(s => s.history);
  const t = useChartTheme();
  const option = useMemo(() => ({
    ...baseOption(t),
    grid: { ...baseOption(t).grid, top: 12 },
    xAxis: { type: 'category', boundaryGap: false, data: history.map(p => hhmm(p.t)), ...axisStyle(t), splitLine: { show: false } },
    yAxis: { type: 'value', min: 49.6, max: 50.3, interval: 0.1, ...axisStyle(t), axisLabel: { color: t.muted, fontSize: 10, formatter: (v: number) => v.toFixed(1) } },
    tooltip: { ...baseOption(t).tooltip, valueFormatter: (v: number) => `${v.toFixed(3)} Hz` },
    series: [{
      name: 'Frequency', type: 'line', symbol: 'none', data: history.map(p => p.freq), lineStyle: { color: '#38BDF8', width: 1.5 }, itemStyle: { color: '#38BDF8' },
      markArea: { silent: true, itemStyle: { color: 'rgba(52,211,153,0.08)' }, data: [[{ yAxis: 49.9 }, { yAxis: 50.05 }]] },
      markLine: { symbol: 'none', silent: true, lineStyle: { color: 'rgba(52,211,153,0.6)', type: 'dashed' }, label: { show: false }, data: [{ yAxis: 50 }] },
    }],
  }), [history, t]);
  return <EChart option={option} height={height} />;
}

/** HVAC bus voltage with ±5% limits. */
export function VoltageChart({ height = 200 }: { height?: number }) {
  const history = useGrid(s => s.history);
  const t = useChartTheme();
  const option = useMemo(() => ({
    ...baseOption(t),
    grid: { ...baseOption(t).grid, top: 12 },
    xAxis: { type: 'category', boundaryGap: false, data: history.map(p => hhmm(p.t)), ...axisStyle(t), splitLine: { show: false } },
    yAxis: { type: 'value', min: 370, max: 430, ...axisStyle(t) },
    tooltip: { ...baseOption(t).tooltip, valueFormatter: (v: number) => `${v.toFixed(1)} kV` },
    series: [{
      name: '400 kV bus', type: 'line', symbol: 'none', data: history.map(p => p.kv), lineStyle: { color: '#A78BFA', width: 1.5 }, itemStyle: { color: '#A78BFA' },
      markLine: { symbol: 'none', silent: true, lineStyle: { color: 'rgba(248,113,113,0.6)', type: 'dashed' }, label: { color: t.muted, fontSize: 10 }, data: [{ yAxis: 380, name: '−5%' }, { yAxis: 420, name: '+5%' }] },
    }],
  }), [history, t]);
  return <EChart option={option} height={height} />;
}

/** State of charge per storage technology. */
export function StorageSocChart({ height = 240 }: { height?: number }) {
  const history = useGrid(s => s.history);
  const t = useChartTheme();
  const option = useMemo(() => ({
    ...baseOption(t),
    xAxis: { type: 'category', boundaryGap: false, data: history.map(p => hhmm(p.t)), ...axisStyle(t), splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, max: 100, ...axisStyle(t), axisLabel: { color: t.muted, fontSize: 10, formatter: '{value}%' } },
    tooltip: { ...baseOption(t).tooltip, valueFormatter: (v: number) => `${v.toFixed(1)}%` },
    series: STORAGE.map(s => ({ name: s.name, type: 'line', symbol: 'none', smooth: true, data: history.map(p => p.soc[s.id]), lineStyle: { color: s.color, width: 1.8 }, itemStyle: { color: s.color } })),
  }), [history, t]);
  return <EChart option={option} height={height} />;
}

/** Storage net power (+charge / −discharge) vs net load, showing charge-low / discharge-peak behaviour. */
export function StoragePowerChart({ height = 220 }: { height?: number }) {
  const history = useGrid(s => s.history);
  const t = useChartTheme();
  const option = useMemo(() => ({
    ...baseOption(t),
    xAxis: { type: 'category', data: history.map(p => hhmm(p.t)), ...axisStyle(t), splitLine: { show: false } },
    yAxis: [{ type: 'value', ...axisStyle(t) }],
    tooltip: { ...baseOption(t).tooltip, valueFormatter: (v: number) => `${Math.round(v)} MW` },
    series: [
      { name: 'Storage (+charge / −discharge)', type: 'bar', barWidth: '70%', data: history.map(p => ({ value: p.storageNet, itemStyle: { color: p.storageNet >= 0 ? '#34D399' : '#F87171' } })) },
      { name: 'Net load', type: 'line', symbol: 'none', smooth: true, data: history.map(p => p.net), lineStyle: { color: '#38BDF8', width: 1.5 }, itemStyle: { color: '#38BDF8' } },
    ],
  }), [history, t]);
  return <EChart option={option} height={height} />;
}

/** Donut of the current generation mix. */
export function MixDonut({ height = 220 }: { height?: number }) {
  const gen = useGrid(s => s.snap.gen);
  const t = useChartTheme();
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, textStyle: { color: t.text, fontSize: 12 }, valueFormatter: (v: number) => `${Math.round(v)} MW` },
    series: [{
      type: 'pie', radius: ['55%', '82%'], avoidLabelOverlap: true, itemStyle: { borderColor: 'transparent', borderWidth: 2 },
      label: { show: false }, labelLine: { show: false },
      data: SOURCES.map(s => ({ name: s.name, value: gen[s.id], itemStyle: { color: s.color } })).filter(d => d.value > 0.5),
    }],
  }), [gen, t]);
  return <EChart option={option} height={height} />;
}

/** Forecast with a shaded confidence band, recent actuals and "now" marker. */
export function ForecastChart({ forecast, actual, color, unit = 'MW', height = 280 }: {
  forecast: ForecastPoint[]; actual: { t: number; v: number }[]; color: string; unit?: string; height?: number;
}) {
  const t = useChartTheme();
  const option = useMemo(() => {
    const all = [...actual.map(a => a.t), ...forecast.map(f => f.t)];
    const labels = all.map(hhmm);
    const pad = <T,>(arr: T[], before: number) => [...Array(before).fill('-'), ...arr];
    const n = actual.length;
    return {
      ...baseOption(t),
      xAxis: { type: 'category', boundaryGap: false, data: labels, ...axisStyle(t), splitLine: { show: false } },
      yAxis: { type: 'value', ...axisStyle(t) },
      tooltip: { ...baseOption(t).tooltip, valueFormatter: (v: number | string) => (typeof v === 'number' ? `${Math.round(v)} ${unit}` : '–') },
      series: [
        { name: 'Lower (90%)', type: 'line', stack: 'band', symbol: 'none', lineStyle: { opacity: 0 }, data: pad(forecast.map(f => f.lower), n), tooltip: { show: false } },
        { name: '90% interval', type: 'line', stack: 'band', symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color, opacity: 0.18 }, itemStyle: { color }, data: pad(forecast.map(f => f.upper - f.lower), n) },
        { name: 'Forecast', type: 'line', symbol: 'none', smooth: true, data: pad(forecast.map(f => f.value), n), lineStyle: { color, width: 2, type: 'dashed' }, itemStyle: { color } },
        {
          name: 'Actual', type: 'line', symbol: 'none', smooth: true, data: actual.map(a => a.v), lineStyle: { color: t.text, width: 2 }, itemStyle: { color: t.text },
          markLine: n ? { symbol: 'none', silent: true, lineStyle: { color: t.muted, type: 'dotted' }, label: { color: t.muted, fontSize: 10, formatter: 'now' }, data: [{ xAxis: n - 1 }] } : undefined,
        },
      ],
      legend: { ...baseOption(t).legend, data: ['Actual', 'Forecast', '90% interval'] },
    };
  }, [forecast, actual, color, unit, t]);
  return <EChart option={option} height={height} />;
}
