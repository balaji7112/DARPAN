// Rule-based DARPAN copilot: answers operator questions from live grid state.
// Always available (no API key needed) and used as the fallback for the LLM path.
import { STORAGE, SOURCES, forecastDemand, forecastSolar, windMW, meanWind, hourOf, type Snapshot } from '../sim/model';
import { severityRank, type Alert } from '../sim/alerts';
import type { HistPoint } from '../store/gridStore';

export interface CopilotContext { snap: Snapshot; alerts: Alert[]; history: HistPoint[]; }

const n = (v: number) => Math.round(v).toLocaleString('en-IN');
const hm = (t: number) => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

function usableStorage(s: Snapshot) {
  return STORAGE.filter(d => d.id !== 'flywheel').reduce((a, d) => a + Math.max(0, (s.storage.find(x => x.id === d.id)!.soc - d.reserve) / 100) * d.energy, 0);
}

function netForecast(s: Snapshot) {
  const d = forecastDemand(s.simTime, 24, 30);
  const so = forecastSolar(s.simTime, s.weather.cloud, 24, 30);
  return d.map((p, i) => ({ t: p.t, demand: p.value, solar: so[i].value, net: p.value - so[i].value - windMW(meanWind(hourOf(p.t))) }));
}

function freqTrend(h: HistPoint[]) {
  const last = h.slice(-6).map(p => p.freq);
  return last.length < 2 ? 0 : last[last.length - 1] - last[0];
}

function openAlerts(alerts: Alert[]) {
  return alerts.filter(a => a.status !== 'resolved').sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

/** Compact, LLM-friendly description of the current grid state. */
export function describeState({ snap: s, alerts }: CopilotContext): string {
  const gen = SOURCES.map(src => `${src.name} ${n(s.gen[src.id])} MW`).join(', ');
  const st = s.storage.map(x => `${STORAGE.find(d => d.id === x.id)!.name} ${x.soc.toFixed(0)}% (${x.power > 0 ? '+' : ''}${n(x.power)} MW, ${x.mode})`).join('; ');
  const al = openAlerts(alerts).slice(0, 6).map(a => `[${a.severity}] ${a.title}: ${a.message}`).join('\n') || 'none';
  return [
    `Grid time: ${new Date(s.simTime).toLocaleString('en-IN', { hour12: false })}${s.isPeak ? ' (evening peak window)' : ''}`,
    `Demand ${n(s.demand)} MW; generation ${n(s.totalGen)} MW; net load ${n(s.netLoad)} MW; renewable share ${s.renewableShare.toFixed(0)}%`,
    `Generation: ${gen}`,
    `Storage: ${st}; usable above reserve ${n(usableStorage(s))} MWh`,
    `Frequency ${s.frequency.toFixed(3)} Hz (telemetry ${s.telemetryOk ? 'ok' : 'STALE'}); HVAC ${s.hvac.voltageKV.toFixed(1)} kV at ${(s.hvac.loading * 100).toFixed(0)}% loading; HVDC ${s.hvdc.online ? `${n(s.hvdc.flow)} MW` : 'TRIPPED'}`,
    `Tie line ${n(s.tieFlow)} MW (+import); curtailment ${n(s.curtailed)} MW; unserved ${n(s.unserved)} MW`,
    `Weather: cloud ${(s.weather.cloud * 100).toFixed(0)}%, wind ${s.weather.windSpeed} m/s, ${s.weather.tempC} °C`,
    `AI decision: ${s.decision.action}. ${s.decision.reason}`,
    `Active faults: ${s.faults.map(f => f.id).join(', ') || 'none'}`,
    `Open alerts:\n${al}`,
  ].join('\n');
}

export function answer(question: string, ctx: CopilotContext): string {
  const q = question.toLowerCase();
  const { snap: s, alerts, history } = ctx;
  const has = (...w: string[]) => w.some(x => q.includes(x));
  const open = openAlerts(alerts);

  if (has('frequency', 'hz', 'freq')) {
    const trend = freqTrend(history);
    const causes: string[] = [];
    if (!s.telemetryOk) causes.push('PMU-07 telemetry is lost, so the value shown is stale. Verify with redundant PMU-08');
    if (!s.hvdc.online) causes.push(`the HVDC link has tripped, removing bulk renewable infeed${s.curtailed > 1 ? ` (${n(s.curtailed)} MW curtailed)` : ''}`);
    if (s.faults.some(f => f.id === 'demand_surge')) causes.push(`a demand surge (${n(s.demand)} MW, about 15% above forecast)`);
    if (s.unserved > 1) causes.push(`a supply deficit of ${n(s.unserved)} MW after all reserves`);
    if (s.faults.some(f => f.id === 'cloud_event')) causes.push(`a cloud event cutting solar to ${n(s.gen.solar)} MW`);
    const state = s.frequency < 49.9 ? 'below' : s.frequency > 50.05 ? 'above' : 'inside';
    let out = `Frequency is **${s.frequency.toFixed(3)} Hz**, ${state} the IEGC band (49.90–50.05 Hz), and ${trend < -0.01 ? 'falling' : trend > 0.01 ? 'rising' : 'stable'} over the last few intervals.`;
    out += causes.length ? `\n\nLikely causes: ${causes.join('; ')}.` : '\n\nNo major disturbance is active. Small deviations come from normal load and renewable variability.';
    if (s.frequency < 49.9) out += `\n\nRecommended: release flywheel (${s.storage.find(x => x.id === 'flywheel')!.soc.toFixed(0)}% SoC) and Li-ion reserves, raise hydro toward 450 MW, and request spinning reserve. Shed non-critical feeders only if it drops below 49.5 Hz.`;
    else if (s.frequency > 50.05) out += '\n\nRecommended: increase storage charging and back down thermal units.';
    return out;
  }

  if (has('discharge', 'charge', 'storage', 'battery', 'soc', 'pumped', 'flywheel')) {
    const nf = netForecast(s);
    const peak = nf.reduce((a, b) => (b.net > a.net ? b : a), nf[0]);
    const trough = nf.reduce((a, b) => (b.net < a.net ? b : a), nf[0]);
    const usable = usableStorage(s);
    const lines = s.storage.map(x => `• ${STORAGE.find(d => d.id === x.id)!.name}: ${x.soc.toFixed(0)}% (${x.mode.toLowerCase()}${x.power ? `, ${x.power > 0 ? '+' : ''}${n(x.power)} MW` : ''})`).join('\n');
    let out = `Storage fleet has **${n(usable)} MWh** usable above reserves. Net power ${s.storageNet > 0 ? '+' : ''}${n(s.storageNet)} MW.\n${lines}`;
    out += `\n\n**Charge** in the low net-load window around ${hm(trough.t)} (net load ≈ ${n(trough.net)} MW, the belly of the duck curve), plus pumped hydro overnight.`;
    out += `\n**Discharge** for the evening peak around ${hm(peak.t)} (net load ≈ ${n(peak.net)} MW). Use Li-ion and sodium-ion first for fast response, then pumped hydro for duration. Keep graphite thermal as emergency reserve.`;
    if (s.storage.find(x => x.id === 'liion')!.mode === 'Derated') out += '\n\n⚠ Li-ion is derated due to high temperature. Shift its duty to sodium-ion and pumped hydro.';
    if (s.isPeak) out += '\n\nWe are in the peak window now, so discharging is the right action.';
    return out;
  }

  if (has('duck', 'ramp', 'net load', 'evening')) {
    const nf = netForecast(s);
    let maxRamp = 0, at = nf[0].t;
    for (let i = 6; i < nf.length; i++) { const r = nf[i].net - nf[i - 6].net; if (r > maxRamp) { maxRamp = r; at = nf[i].t; } }
    const trough = nf.reduce((a, b) => (b.net < a.net ? b : a), nf[0]);
    return `Net load (demand − solar − wind) is **${n(s.netLoad)} MW** now. The forecast belly is ≈ ${n(trough.net)} MW at ${hm(trough.t)}. The steepest 3-hour ramp is **+${n(maxRamp)} MW**, ending ${hm(at)}.\n\nTo flatten the duck: store midday surplus in Li-ion and pumped hydro, pre-warm thermal 1–2 h before the ramp, and shift flexible EV charging after 22:00.`;
  }

  if (has('solar', 'sun', 'pv')) {
    const exp = forecastSolar(s.simTime - 1800_000, 0.22, 1, 30)[0]?.value ?? 0;
    return `Solar output is **${n(s.gen.solar)} MW** of 1,400 MW capacity (irradiance ${n(s.weather.irradiance)} W/m², cloud ${(s.weather.cloud * 100).toFixed(0)}%). ${s.hour < 6 || s.hour > 18.5 ? 'It is night, so zero output is expected.' : s.gen.solar < exp * 0.7 ? `That is well below the ≈ ${n(exp)} MW expected for this hour under typical skies${s.weather.cloud > 0.5 ? ', mainly due to heavy cloud cover' : ''}${!s.hvdc.online ? ' and HVDC-trip curtailment' : ''}.` : 'This is in line with expectations for the time of day.'}`;
  }

  if (has('wind')) {
    return `Wind generation is **${n(s.gen.wind)} MW** at ${s.weather.windSpeed} m/s (cut-in 3 m/s, rated 12 m/s, capacity 700 MW). ${s.faults.some(f => f.id === 'wind_lull') ? 'A wind lull is active, so hydro and storage are compensating.' : 'Wind is typically stronger at night, which helps the overnight base.'}`;
  }

  if (has('demand', 'load', 'peak', 'consumption')) {
    const d = forecastDemand(s.simTime, 24, 30);
    const pk = d.reduce((a, b) => (b.value > a.value ? b : a), d[0]);
    const r = s.receivers;
    return `Demand is **${n(s.demand)} MW** (homes ${n(r.homes)}, industry ${n(r.industry)}, commercial ${n(r.commercial)}, EV ${n(r.ev)}, critical ${n(r.critical)} MW). Next forecast peak: **${n(pk.value)} MW at ${hm(pk.t)}** (90% interval ${n(pk.lower)}–${n(pk.upper)} MW).`;
  }

  if (has('hvdc', 'hvac', 'transmission', 'voltage', 'line', 'kv')) {
    return `HVDC ±800 kV link: ${s.hvdc.online ? `**${n(s.hvdc.flow)} MW**, losses ${n(s.hvdc.losses)} MW` : '**TRIPPED**. Remote renewables are limited to the HVAC corridor'}. HVAC 400 kV corridor: ${n(s.hvac.flow)} MW at ${(s.hvac.loading * 100).toFixed(0)}% loading, bus voltage ${s.hvac.voltageKV.toFixed(1)} kV (limits 380–420 kV). HVDC carries bulk renewables at ≈1.6% loss vs ≈3.2% on HVAC.`;
  }

  if (has('alert', 'anomal', 'wrong', 'issue', 'problem', 'warning', 'fault')) {
    if (!open.length) return 'There are no open alerts. All monitored parameters are within limits.';
    return `There ${open.length === 1 ? 'is 1 open alert' : `are ${open.length} open alerts`}. Highest priority:\n\n` +
      open.slice(0, 3).map(a => `• **[${a.severity.toUpperCase()}] ${a.title}** (${a.asset}): ${a.message}\n  → ${a.recommendation}`).join('\n');
  }

  if (has('renewable', 'carbon', 'co2', 'green', 'emission')) {
    return `Renewable share is **${s.renewableShare.toFixed(0)}%** right now. Today: ${n(s.today.renewableMWh)} MWh renewable, **${n(s.today.co2AvoidedT)} t CO₂ avoided**, ${n(s.today.curtailedMWh)} MWh curtailed. Reducing curtailment by adding storage charging in the midday window is the biggest lever.`;
  }

  if (has('forecast', 'predict', 'tomorrow', 'next')) {
    const so = forecastSolar(s.simTime, s.weather.cloud, 24, 30);
    const d = forecastDemand(s.simTime, 24, 30);
    const ps = so.reduce((a, b) => (b.value > a.value ? b : a), so[0]);
    const pd = d.reduce((a, b) => (b.value > a.value ? b : a), d[0]);
    return `Next 24 h: solar peaks at **${n(ps.value)} MW around ${hm(ps.t)}**; demand peaks at **${n(pd.value)} MW around ${hm(pd.t)}**. Uncertainty widens with horizon (see the Forecasting page for 90% bands).`;
  }

  if (has('help', 'what can you', 'hello', 'hi ')) {
    return 'I can explain live grid conditions and recommend actions. Try: "Why is frequency dropping?", "When should we discharge storage?", "What is wrong right now?", "Explain the duck curve", or "Status summary".';
  }

  // Default: status summary
  const top = open[0];
  return `**Grid status** at ${hm(s.simTime)}: demand ${n(s.demand)} MW, generation ${n(s.totalGen)} MW, renewable share ${s.renewableShare.toFixed(0)}%, frequency ${s.frequency.toFixed(3)} Hz.\n\nAI control: ${s.decision.action}.\n${top ? `Top alert: [${top.severity}] ${top.title}.` : 'No open alerts.'}\n\nAsk me about frequency, storage dispatch, the duck curve, forecasts or alerts.`;
}
