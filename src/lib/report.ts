// Builds a self-contained, printable HTML grid status report.
import { SOURCES, STORAGE, type Snapshot, type ForecastPoint } from '../sim/model';
import type { Alert } from '../sim/alerts';

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const n = (v: number, d = 0) => v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const time = (t: number) => new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', hour12: false });
const hm = (t: number) => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

export interface ReportInput {
  snap: Snapshot; alerts: Alert[]; solar: ForecastPoint[]; demand: ForecastPoint[];
  forecastSource: string; author: string;
}

export function buildReport({ snap: s, alerts, solar, demand, forecastSource, author }: ReportInput): string {
  const total = Object.values(s.gen).reduce((a, b) => a + b, 0);
  const peakS = solar.reduce((a, b) => (b.value > a.value ? b : a), solar[0]);
  const peakD = demand.reduce((a, b) => (b.value > a.value ? b : a), demand[0]);
  const open = alerts.filter(a => a.status !== 'resolved');
  const resolved = alerts.filter(a => a.status === 'resolved').slice(0, 10);
  const usable = STORAGE.reduce((a, d) => a + Math.max(0, (s.storage.find(x => x.id === d.id)!.soc - d.reserve) / 100) * d.energy, 0);
  const fOk = s.frequency >= 49.9 && s.frequency <= 50.05;

  const kpi = (label: string, value: string, sub = '') => `<div class="kpi"><div class="k">${label}</div><div class="v">${value}</div><div class="s">${sub}</div></div>`;
  const alertRows = (list: Alert[]) => list.length
    ? list.map(a => `<tr><td><span class="sev ${a.severity}">${a.severity}</span></td><td>${esc(a.title)}<div class="muted">${esc(a.message)}</div></td><td>${esc(a.asset)}</td><td>${a.status}</td><td>${hm(a.raisedAt)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="muted">None</td></tr>';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>DARPAN Grid Status Report · ${time(Date.now())}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *{box-sizing:border-box} body{font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;margin:0;padding:32px;max-width:960px;margin:auto;font-size:13px;line-height:1.5;background:#fff}
  h1{font-size:22px;margin:0} h2{font-size:15px;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
  .head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:3px solid #0284c7;padding-bottom:14px}
  .muted{color:#64748b;font-size:11px} .badge{display:inline-block;background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px} .kpi{border:1px solid #e2e8f0;border-radius:8px;padding:10px}
  .k{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;font-weight:600} .v{font-size:20px;font-weight:700;margin-top:2px} .s{font-size:11px;color:#64748b}
  table{width:100%;border-collapse:collapse} th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top} th{font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:.04em}
  td.r,th.r{text-align:right} .bar{height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;min-width:80px} .bar>i{display:block;height:100%}
  .sev{font-size:9px;font-weight:700;text-transform:uppercase;padding:2px 5px;border-radius:3px} .sev.low{background:#e0e7ff;color:#3730a3} .sev.medium{background:#fef3c7;color:#92400e} .sev.high{background:#fee2e2;color:#991b1b} .sev.critical{background:#dc2626;color:#fff}
  .box{background:#f1f5f9;border-radius:8px;padding:12px} .ok{color:#059669} .bad{color:#dc2626}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px}
  @media (max-width:640px){body{padding:16px}.grid{grid-template-columns:repeat(2,1fr)}.two{grid-template-columns:1fr}}
  @media print{body{padding:0}h2{break-after:avoid}table{break-inside:auto}tr{break-inside:avoid}}
</style></head><body>
<div class="head">
  <div><h1>DARPAN · Grid Status Report</h1><div class="muted">Hybrid HVAC–HVDC Smart Grid Management Platform</div></div>
  <div style="text-align:right"><div><b>Generated:</b> ${time(Date.now())}</div><div><b>Grid time:</b> ${time(s.simTime)}</div><div><b>By:</b> ${esc(author)}</div><span class="badge">SIMULATED DATA</span></div>
</div>

<h2>1. Executive summary</h2>
<div class="grid">
  ${kpi('Demand', `${n(s.demand)} MW`, s.isPeak ? 'Evening peak window' : `Peak today ${n(s.today.peakDemand)} MW`)}
  ${kpi('Generation', `${n(s.totalGen)} MW`, s.tieFlow > 1 ? `Import ${n(s.tieFlow)} MW` : s.tieFlow < -1 ? `Export ${n(-s.tieFlow)} MW` : 'Tie idle')}
  ${kpi('Renewable share', `${n(s.renewableShare)}%`, `${n(s.today.renewableMWh)} MWh today`)}
  ${kpi('Frequency', `<span class="${fOk ? 'ok' : 'bad'}">${s.frequency.toFixed(3)} Hz</span>`, 'IEGC band 49.90–50.05')}
  ${kpi('Storage usable', `${n(usable)} MWh`, `Net ${s.storageNet > 0 ? '+' : ''}${n(s.storageNet)} MW`)}
  ${kpi('Open alerts', `${open.length}`, `${open.filter(a => a.severity === 'critical').length} critical`)}
  ${kpi('CO₂ avoided today', `${n(s.today.co2AvoidedT)} t`, '0.82 t/MWh grid factor')}
  ${kpi('Curtailed today', `${n(s.today.curtailedMWh)} MWh`, `Unserved ${n(s.today.unservedMWh)} MWh`)}
</div>
<div class="box" style="margin-top:12px"><b>AI control decision (${s.decision.mode}):</b> ${esc(s.decision.action)}. <span class="muted">${esc(s.decision.reason)}</span></div>
${s.faults.length ? `<p class="bad"><b>Active fault scenarios:</b> ${s.faults.map(f => f.id.replace('_', ' ')).join(', ')}</p>` : ''}

<h2>2. Generation by source</h2>
<table><thead><tr><th>Source</th><th>Type</th><th class="r">Output (MW)</th><th class="r">Capacity (MW)</th><th>Capacity factor</th><th class="r">Share</th></tr></thead><tbody>
${SOURCES.map(src => { const v = s.gen[src.id]; const cf = (v / src.capacity) * 100; return `<tr><td>${src.name}</td><td>${src.kind}${src.renewable ? ' · RE' : ''}</td><td class="r">${n(v)}</td><td class="r">${n(src.capacity)}</td><td><div class="bar"><i style="width:${cf}%;background:${src.color}"></i></div></td><td class="r">${((v / total) * 100).toFixed(1)}%</td></tr>`; }).join('')}
</tbody></table>

<h2>3. Hybrid storage</h2>
<table><thead><tr><th>Technology</th><th class="r">SoC</th><th>Level</th><th class="r">Power (MW)</th><th>Mode</th><th class="r">Energy (MWh)</th><th class="r">Temp</th></tr></thead><tbody>
${STORAGE.map(d => { const st = s.storage.find(x => x.id === d.id)!; return `<tr><td>${d.name}</td><td class="r">${st.soc.toFixed(1)}%</td><td><div class="bar"><i style="width:${st.soc}%;background:${d.color}"></i></div></td><td class="r">${st.power > 0 ? '+' : ''}${n(st.power)}</td><td>${st.mode}</td><td class="r">${n(d.energy)}</td><td class="r">${st.temp.toFixed(0)} °C</td></tr>`; }).join('')}
</tbody></table>

<div class="two">
<div><h2>4. Grid &amp; transmission</h2>
<table><tbody>
<tr><td>400 kV HVAC bus</td><td class="r">${s.hvac.voltageKV.toFixed(1)} kV</td></tr>
<tr><td>HVAC flow / loading</td><td class="r">${n(s.hvac.flow)} MW · ${(s.hvac.loading * 100).toFixed(0)}%</td></tr>
<tr><td>±800 kV HVDC link</td><td class="r">${s.hvdc.online ? `${n(s.hvdc.flow)} MW` : '<span class="bad">TRIPPED</span>'}</td></tr>
<tr><td>Transmission losses</td><td class="r">${n(s.hvac.losses + s.hvdc.losses)} MW</td></tr>
<tr><td>Inter-regional tie</td><td class="r">${n(s.tieFlow)} MW</td></tr>
<tr><td>Curtailment now</td><td class="r">${n(s.curtailed)} MW</td></tr>
</tbody></table></div>
<div><h2>5. 24 h forecast</h2>
<table><tbody>
<tr><td>Model source</td><td class="r">${esc(forecastSource)}</td></tr>
<tr><td>Peak solar</td><td class="r">${n(peakS?.value ?? 0)} MW at ${peakS ? hm(peakS.t) : '–'}</td></tr>
<tr><td>Peak demand</td><td class="r">${n(peakD?.value ?? 0)} MW at ${peakD ? hm(peakD.t) : '–'}</td></tr>
<tr><td>Peak demand 90% interval</td><td class="r">${n(peakD?.lower ?? 0)} – ${n(peakD?.upper ?? 0)} MW</td></tr>
<tr><td>Energy forecast (demand)</td><td class="r">${n(demand.reduce((a, p) => a + p.value * 0.5, 0))} MWh</td></tr>
<tr><td>Energy forecast (solar)</td><td class="r">${n(solar.reduce((a, p) => a + p.value * 0.5, 0))} MWh</td></tr>
</tbody></table></div>
</div>

<h2>6. Open alerts (${open.length})</h2>
<table><thead><tr><th>Severity</th><th>Alert</th><th>Asset</th><th>Status</th><th>Raised</th></tr></thead><tbody>${alertRows(open)}</tbody></table>

<h2>7. Recently resolved</h2>
<table><thead><tr><th>Severity</th><th>Alert</th><th>Asset</th><th>Status</th><th>Raised</th></tr></thead><tbody>${alertRows(resolved)}</tbody></table>

<footer>DARPAN, Team DARPAN · OIST Bhopal · SIH26200 (minor project). Values are produced by the DARPAN grid simulator for demonstration. AI recommendations are advisory only; critical control remains with local protection systems and operators.</footer>
</body></html>`;
}
