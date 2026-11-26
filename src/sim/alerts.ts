// Anomaly detection + predictive early-warning rules over live telemetry.
// Conditions are evaluated every tick and reconciled into a persistent alert
// list so operators can acknowledge / resolve without the next tick undoing it.
import { type Snapshot, STORAGE, HVAC_CAP, expectedDemand, expectedSolar, forecastDemand, forecastSolar, windMW, meanWind } from './model';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type AlertCategory = 'Anomaly' | 'Early warning' | 'Protection';

export interface Alert {
  id: string; key: string; title: string; severity: Severity; category: AlertCategory;
  asset: string; message: string; recommendation: string; score: number;
  raisedAt: number; simAt: number; lastSeen: number;
  status: AlertStatus; cleared: boolean; clearedTicks: number;
  ackBy?: string; resolvedBy?: string; resolvedAt?: number;
}

interface Condition {
  key: string; title: string; severity: Severity; category: AlertCategory;
  asset: string; message: string; recommendation: string; score: number;
}

const SEV_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
export const severityRank = (s: Severity) => SEV_RANK[s];

/** Isolation-Forest-style anomaly score in [0,1] from a standardised residual. */
export const anomalyScore = (z: number) => Math.round((1 - Math.exp(-Math.abs(z) / 4)) * 100) / 100;

export function evaluate(s: Snapshot): Condition[] {
  const out: Condition[] = [];
  const f = s.frequency;

  if (!s.telemetryOk) {
    out.push({ key: 'pmu', title: 'PMU telemetry loss', severity: 'medium', category: 'Protection', asset: 'PMU-07 (400 kV bus)',
      message: 'No synchrophasor frames received; frequency and voltage are showing last known values.', score: 0.7,
      recommendation: 'Fail over to redundant PMU-08 via TSN ring, verify GPS / PCIe atomic clock sync, dispatch field crew if not restored.' });
  } else if (f < 49.9) {
    const sev: Severity = f < 49.6 ? 'critical' : f < 49.8 ? 'high' : 'medium';
    out.push({ key: 'underfreq', title: 'Under-frequency excursion', severity: sev, category: 'Protection', asset: 'System frequency',
      message: `Frequency at ${f.toFixed(3)} Hz, below the IEGC band (49.90–50.05 Hz).`, score: anomalyScore((50 - f) / 0.03),
      recommendation: 'Release flywheel and Li-ion reserves, raise hydro output, and request spinning reserve. Shed non-critical feeders only below 49.5 Hz.' });
  } else if (f > 50.05) {
    out.push({ key: 'overfreq', title: 'Over-frequency excursion', severity: f > 50.15 ? 'high' : 'low', category: 'Protection', asset: 'System frequency',
      message: `Frequency at ${f.toFixed(3)} Hz, above the IEGC band.`, score: anomalyScore((f - 50) / 0.03),
      recommendation: 'Increase storage charging and back down thermal units; curtail solar ramp if it persists.' });
  }

  const kv = s.hvac.voltageKV;
  if (s.telemetryOk && (kv < 380 || kv > 420)) {
    out.push({ key: 'voltage', title: kv < 380 ? 'HVAC under-voltage' : 'HVAC over-voltage', severity: kv < 372 || kv > 428 ? 'high' : 'medium',
      category: 'Protection', asset: '400 kV HVAC corridor', message: `Bus voltage ${kv.toFixed(1)} kV is outside ±5% of nominal.`, score: anomalyScore((kv - 400) / 5),
      recommendation: kv < 380 ? 'Switch in shunt capacitors / STATCOM support and reduce corridor loading.' : 'Switch in shunt reactors.' });
  }

  if (!s.hvdc.online) {
    out.push({ key: 'hvdc', title: 'HVDC link tripped', severity: 'critical', category: 'Protection', asset: '±800 kV HVDC link',
      message: `Converter station offline. Remote renewables limited to the HVAC corridor${s.curtailed > 1 ? `; ${s.curtailed.toFixed(0)} MW curtailed` : ''}.`, score: 0.95,
      recommendation: 'Isolate the DC fault, re-route power over HVAC, ramp local thermal/hydro, and attempt converter restart after protection clears.' });
  }

  if (s.hvac.loading > 0.85) {
    out.push({ key: 'loading', title: 'HVAC corridor congestion', severity: s.hvac.loading > 0.95 ? 'high' : 'medium', category: 'Early warning',
      asset: '400 kV HVAC corridor', message: `Line loading at ${(s.hvac.loading * 100).toFixed(0)}% of ${HVAC_CAP} MW thermal limit.`, score: s.hvac.loading,
      recommendation: 'Shift flow to the HVDC link, dispatch local storage, defer flexible EV load.' });
  }

  const li = s.storage.find(x => x.id === 'liion')!;
  if (li.temp > 42) {
    out.push({ key: 'liion-temp', title: 'Li-ion BESS overheating', severity: li.temp > 50 ? 'critical' : li.temp > 45 ? 'high' : 'medium',
      category: 'Anomaly', asset: 'Li-ion BESS', message: `Cell temperature ${li.temp.toFixed(1)} °C. ${li.mode === 'Derated' ? 'AI control has derated the unit to 30% power.' : ''}`,
      score: anomalyScore((li.temp - 30) / 3), recommendation: 'Inspect HVAC/cooling loop, hold charge/discharge, shift duty to sodium-ion and pumped hydro.' });
  }

  if (s.unserved > 1) {
    out.push({ key: 'unserved', title: 'Load shedding active', severity: 'critical', category: 'Protection', asset: 'Distribution feeders',
      message: `${s.unserved.toFixed(0)} MW of demand not served. Critical loads protected.`, score: 0.99,
      recommendation: 'Max out tie-line import, request emergency assistance from neighbouring region, rotate shedding across non-critical feeders.' });
  }

  if (s.curtailed > 100) {
    out.push({ key: 'curtail', title: 'Renewable curtailment', severity: 'low', category: 'Early warning', asset: 'Solar / wind park',
      message: `${s.curtailed.toFixed(0)} MW of renewable energy is being curtailed.`, score: 0.4,
      recommendation: 'Raise storage charging set-points and schedule flexible loads (EV, pumping) into this window.' });
  }

  if (s.tieFlow > 550) {
    out.push({ key: 'import', title: 'High inter-regional import', severity: 'medium', category: 'Early warning', asset: 'Inter-regional tie',
      message: `Importing ${s.tieFlow.toFixed(0)} MW (limit 700 MW).`, score: 0.6,
      recommendation: 'Bring additional local generation online; keep graphite thermal reserve ready.' });
  }

  // Residual-based anomalies (actual vs expected); z-score feeds the IF-style score
  const expD = expectedDemand(s.simTime);
  const zD = (s.demand - expD) / (0.025 * expD);
  if (Math.abs(zD) > 3.5) {
    out.push({ key: 'demand-anom', title: 'Demand anomaly', severity: Math.abs(zD) > 6 ? 'high' : 'medium', category: 'Anomaly', asset: 'Load forecast residual',
      message: `Demand ${s.demand.toFixed(0)} MW vs expected ${expD.toFixed(0)} MW (${zD > 0 ? '+' : ''}${(((s.demand - expD) / expD) * 100).toFixed(1)}%).`,
      score: anomalyScore(zD), recommendation: 'Check for heatwave / event load, verify meter data, pre-position storage for an elevated peak.' });
  }
  const expS = expectedSolar(s.simTime);
  if (expS > 200 && s.gen.solar < expS * 0.6 && s.hvdc.online) {
    out.push({ key: 'solar-anom', title: 'Solar output below expected', severity: s.gen.solar < expS * 0.4 ? 'high' : 'medium', category: 'Anomaly', asset: 'Solar park',
      message: `Solar ${s.gen.solar.toFixed(0)} MW vs ${expS.toFixed(0)} MW expected (cloud cover ${(s.weather.cloud * 100).toFixed(0)}%).`,
      score: anomalyScore((expS - s.gen.solar) / (0.08 * expS)), recommendation: 'Confirm with sky imager / satellite nowcast, ramp hydro, keep Li-ion ready for the gap.' });
  }
  const expW = windMW(meanWind(s.hour));
  if (expW > 150 && s.gen.wind < expW * 0.3) {
    out.push({ key: 'wind-anom', title: 'Wind generation lull', severity: 'medium', category: 'Anomaly', asset: 'Wind farm',
      message: `Wind ${s.gen.wind.toFixed(0)} MW vs ${expW.toFixed(0)} MW expected (${s.weather.windSpeed} m/s).`, score: 0.72,
      recommendation: 'Compensate with hydro and storage; review the wind forecast for duration.' });
  }

  // Predictive early warnings (forecast-driven)
  if (s.hour >= 13 && s.hour < 17.5) {
    const d = forecastDemand(s.simTime, 4, 60);
    const so = forecastSolar(s.simTime, s.weather.cloud, 4, 60);
    const netNow = s.demand - s.gen.solar - s.gen.wind;
    const netMax = Math.max(...d.map((p, i) => p.value - so[i].value - s.gen.wind));
    const rampMW = netMax - netNow;
    if (rampMW > 700) {
      out.push({ key: 'ramp', title: 'Steep evening ramp predicted', severity: rampMW > 1100 ? 'medium' : 'low', category: 'Early warning', asset: 'Net load (duck curve)',
        message: `Net load forecast to rise ${rampMW.toFixed(0)} MW within 4 h as solar sets.`, score: Math.min(0.95, rampMW / 1500),
        recommendation: 'Pre-warm thermal units, top up Li-ion / pumped hydro now, and schedule EV charging after 22:00.' });
    }
    const usable = s.storage.filter(x => x.id !== 'flywheel').reduce((a, x) => {
      const def = STORAGE.find(d2 => d2.id === x.id)!;
      return a + Math.max(0, (x.soc - def.reserve) / 100) * def.energy;
    }, 0);
    if (s.hour >= 15 && usable < 1200) {
      out.push({ key: 'reserve', title: 'Low storage reserve before peak', severity: usable < 600 ? 'high' : 'medium', category: 'Early warning', asset: 'Hybrid storage fleet',
        message: `Only ${usable.toFixed(0)} MWh usable storage ahead of the evening peak.`, score: 0.75,
        recommendation: 'Charge pumped hydro and sodium-ion from remaining solar; arrange tie-line import for 19:00–21:00.' });
    }
  }

  return out;
}

const AUTO_RESOLVE_TICKS = 8;
const MAX_ALERTS = 60;

export function reconcile(alerts: Alert[], conds: Condition[], s: Snapshot, tick: number): { alerts: Alert[]; raised: Alert[] } {
  const now = Date.now();
  const byKey = new Map(conds.map(c => [c.key, c]));
  const raised: Alert[] = [];

  const next = alerts.map(a => {
    if (a.status === 'resolved') return a;
    const c = byKey.get(a.key);
    if (c) {
      byKey.delete(a.key);
      return { ...a, title: c.title, message: c.message, score: Math.max(a.score, c.score),
        severity: SEV_RANK[c.severity] > SEV_RANK[a.severity] ? c.severity : a.severity,
        lastSeen: now, cleared: false, clearedTicks: 0 };
    }
    const clearedTicks = a.clearedTicks + 1;
    if (clearedTicks >= AUTO_RESOLVE_TICKS) {
      return { ...a, cleared: true, clearedTicks, status: 'resolved' as const, resolvedBy: 'Auto (condition cleared)', resolvedAt: now };
    }
    return { ...a, cleared: true, clearedTicks };
  });

  for (const c of byKey.values()) {
    // An operator just resolved this condition: suppress re-raising it for a minute.
    if (alerts.some(a => a.key === c.key && a.status === 'resolved' && a.resolvedAt && now - a.resolvedAt < 60_000)) continue;
    const a: Alert = { ...c, id: `${c.key}-${tick}`, raisedAt: now, simAt: s.simTime, lastSeen: now, status: 'active', cleared: false, clearedTicks: 0 };
    next.unshift(a);
    raised.push(a);
  }

  if (next.length > MAX_ALERTS) {
    const open = next.filter(a => a.status !== 'resolved');
    const resolved = next.filter(a => a.status === 'resolved').slice(0, Math.max(0, MAX_ALERTS - open.length));
    return { alerts: [...open, ...resolved].sort((x, y) => y.raisedAt - x.raisedAt), raised };
  }
  return { alerts: next, raised };
}
