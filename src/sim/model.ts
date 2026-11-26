// DARPAN grid telemetry simulator.
// A regional hybrid HVAC–HVDC grid (MW scale) with a diurnal solar curve,
// stochastic wind, morning/evening demand peaks, five storage technologies
// and a rule-based "AI control" dispatch layer. Pure functions, no React.

export type SourceId = 'solar' | 'wind' | 'hydro' | 'nuclear' | 'geothermal' | 'biomass' | 'thermal';
export type StorageId = 'flywheel' | 'liion' | 'naion' | 'pumped' | 'graphite';
export type FaultId = 'cloud_event' | 'wind_lull' | 'hvdc_trip' | 'demand_surge' | 'liion_overheat' | 'pmu_dropout';

export interface SourceDef {
  id: SourceId; name: string; capacity: number; color: string;
  renewable: boolean; kind: 'Variable' | 'Baseload' | 'Dispatchable';
}

export interface StorageDef {
  id: StorageId; name: string; energy: number; power: number;
  eff: number; color: string; role: string; reserve: number;
}

export const SOURCES: SourceDef[] = [
  { id: 'solar',      name: 'Solar PV / CSP',      capacity: 1400, color: '#F5A524', renewable: true,  kind: 'Variable' },
  { id: 'wind',       name: 'Wind',                capacity: 700,  color: '#38BDF8', renewable: true,  kind: 'Variable' },
  { id: 'hydro',      name: 'Hydro',               capacity: 450,  color: '#3B82F6', renewable: true,  kind: 'Dispatchable' },
  { id: 'nuclear',    name: 'Nuclear',             capacity: 500,  color: '#A78BFA', renewable: false, kind: 'Baseload' },
  { id: 'geothermal', name: 'Geothermal',          capacity: 60,   color: '#F472B6', renewable: true,  kind: 'Baseload' },
  { id: 'biomass',    name: 'Biomass',             capacity: 120,  color: '#84CC16', renewable: true,  kind: 'Dispatchable' },
  { id: 'thermal',    name: 'Coal / Gas',          capacity: 800,  color: '#94A3B8', renewable: false, kind: 'Dispatchable' },
];

export const STORAGE: StorageDef[] = [
  { id: 'flywheel', name: 'Kinetic Flywheel', energy: 25,   power: 100, eff: 0.86, color: '#22D3EE', role: 'Frequency regulation (ms response)', reserve: 10 },
  { id: 'liion',    name: 'Li-ion BESS',      energy: 600,  power: 250, eff: 0.92, color: '#34D399', role: 'Fast peak shaving',                 reserve: 15 },
  { id: 'naion',    name: 'Sodium-ion BESS',  energy: 300,  power: 120, eff: 0.88, color: '#FBBF24', role: 'Daily load shifting, low cost',      reserve: 15 },
  { id: 'pumped',   name: 'Pumped Hydro',     energy: 2400, power: 400, eff: 0.78, color: '#818CF8', role: 'Bulk long-duration storage',         reserve: 15 },
  { id: 'graphite', name: 'Graphite Thermal', energy: 800,  power: 120, eff: 0.55, color: '#F87171', role: 'Thermal reserve for emergencies',    reserve: 30 },
];

export const FAULTS: { id: FaultId; label: string; description: string; ticks: number }[] = [
  { id: 'cloud_event',    label: 'Cloud cover event',   description: 'Heavy cloud bank over the solar park',              ticks: 30 },
  { id: 'wind_lull',      label: 'Wind lull',           description: 'Wind speed collapses below cut-in',                ticks: 30 },
  { id: 'hvdc_trip',      label: 'HVDC converter trip', description: '±800 kV link trips, remote RE limited to HVAC',    ticks: 20 },
  { id: 'demand_surge',   label: 'Demand surge',        description: 'Heatwave pushes load +15%',                        ticks: 30 },
  { id: 'liion_overheat', label: 'Li-ion overheating',  description: 'BESS cooling failure, cell temperature rising',    ticks: 25 },
  { id: 'pmu_dropout',    label: 'PMU telemetry loss',  description: 'Phasor unit PMU-07 stops reporting',               ticks: 15 },
];

export const THERMAL_MIN = 200;          // MW minimum stable generation
export const THERMAL_RAMP = 25;          // MW per simulated minute
export const TIE_CAP = 700;              // MW inter-regional HVAC tie
export const HVDC_CAP = 1500;            // MW
export const HVAC_CAP = 3200;            // MW
export const HVDC_TRIP_RE_LIMIT = 800;   // MW of remote RE deliverable over HVAC only
export const CO2_T_PER_MWH = 0.82;       // Indian grid emission factor

// ── Types ─────────────────────────────────────────────────────────────────────
export interface StorageState {
  id: StorageId; soc: number; power: number; // +charging, −discharging (MW, grid side)
  mode: 'Charging' | 'Discharging' | 'Idle' | 'Derated'; temp: number;
}

export interface Receivers { homes: number; industry: number; commercial: number; ev: number; critical: number; }

export interface Decision {
  mode: 'CHARGE' | 'DISCHARGE' | 'BALANCE' | 'RAMP' | 'EMERGENCY';
  action: string; reason: string; confidence: number;
}

export interface DayTotals {
  day: number; demandMWh: number; renewableMWh: number; curtailedMWh: number;
  importMWh: number; exportMWh: number; co2AvoidedT: number; peakDemand: number; unservedMWh: number;
}

export interface Snapshot {
  simTime: number; hour: number; isPeak: boolean;
  weather: { cloud: number; windSpeed: number; tempC: number; irradiance: number };
  gen: Record<SourceId, number>;
  demand: number; receivers: Receivers;
  storage: StorageState[]; storageNet: number;
  tieFlow: number; curtailed: number; unserved: number;
  hvdc: { flow: number; voltageKV: number; online: boolean; losses: number };
  hvac: { flow: number; voltageKV: number; loading: number; losses: number };
  frequency: number; telemetryOk: boolean;
  renewableShare: number; netLoad: number; totalGen: number;
  decision: Decision;
  faults: { id: FaultId; ticksLeft: number }[];
  today: DayTotals;
}

export interface SimState {
  snap: Snapshot;
  windSpeed: number; cloud: number; freqDev: number;
  thermal: number; losses: number;
  soc: Record<StorageId, number>; temps: Record<StorageId, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const noise = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; // ~N(0, 0.4), bounded

function gauss(h: number, mu: number, sigma: number) {
  let d = h - mu;
  if (d > 12) d -= 24;
  if (d < -12) d += 24;
  return Math.exp(-0.5 * (d / sigma) ** 2);
}

export const hourOf = (t: number) => { const d = new Date(t); return d.getHours() + d.getMinutes() / 60; };
const isWeekend = (t: number) => [0, 6].includes(new Date(t).getDay());
const dayKey = (t: number) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / 86400000);

// ── Physical models ───────────────────────────────────────────────────────────
export const clearSky = (h: number) => (h <= 6 || h >= 18.6 ? 0 : Math.sin((Math.PI * (h - 6)) / 12.6) ** 1.3);
export const ambientTemp = (h: number) => 27 + 7 * Math.sin((2 * Math.PI * (h - 9)) / 24);
export const meanWind = (h: number) => 7 + 2 * Math.cos((2 * Math.PI * (h - 3)) / 24);
export const CLOUD_BASE = 0.22;

export function solarMW(h: number, cloud: number, temp: number) {
  return 1400 * clearSky(h) * (1 - 0.72 * cloud) * (1 - 0.004 * Math.max(0, temp - 25));
}

export function windMW(v: number) {
  if (v < 3 || v > 25) return 0;
  if (v >= 12) return 700;
  return (700 * (v ** 3 - 27)) / (12 ** 3 - 27);
}

export function demandMW(h: number, weekend: boolean, temp: number) {
  const base = 1350 + 520 * gauss(h, 9.5, 1.8) + 300 * gauss(h, 14, 3) + 950 * gauss(h, 20.3, 2) - 120 * gauss(h, 3.5, 2.2);
  return base * (weekend ? 0.93 : 1) * (1 + 0.006 * (temp - 30));
}

function receiversFor(h: number, demand: number): Receivers {
  const critical = 140;
  const ev = 50 + 160 * gauss(h, 23, 2.2) + 90 * gauss(h, 13, 1.8);
  const industry = 480 + 220 * gauss(h, 12, 4);
  const commercial = 120 + 260 * gauss(h, 15, 3.2);
  const homes = Math.max(150, demand - critical - ev - industry - commercial);
  const k = demand / (homes + critical + ev + industry + commercial);
  return { homes: homes * k, industry: industry * k, commercial: commercial * k, ev: ev * k, critical: critical * k };
}

// ── Storage helpers ───────────────────────────────────────────────────────────
const DEF = Object.fromEntries(STORAGE.map(s => [s.id, s])) as Record<StorageId, StorageDef>;

function chargeHeadroomMW(id: StorageId, soc: number, dtH: number, limit: number) {
  const d = DEF[id];
  const oneWay = Math.sqrt(d.eff);
  const energyRoom = ((95 - soc) / 100) * d.energy;
  return clamp(Math.min(limit, energyRoom / dtH / oneWay), 0, limit);
}

function dischargeAvailMW(id: StorageId, soc: number, dtH: number, limit: number, reserve = DEF[id].reserve) {
  const d = DEF[id];
  const oneWay = Math.sqrt(d.eff);
  const energyAvail = ((soc - reserve) / 100) * d.energy;
  // Taper power as SOC approaches reserve so stores do not hit the floor abruptly.
  const taper = clamp((soc - reserve) / 25, 0, 1);
  return clamp(Math.min(limit * taper, (energyAvail * oneWay) / dtH), 0, limit);
}

// ── Initial state ─────────────────────────────────────────────────────────────
function emptyTotals(t: number): DayTotals {
  return { day: dayKey(t), demandMWh: 0, renewableMWh: 0, curtailedMWh: 0, importMWh: 0, exportMWh: 0, co2AvoidedT: 0, peakDemand: 0, unservedMWh: 0 };
}

export function initialState(t: number): SimState {
  const soc: Record<StorageId, number> = { flywheel: 80, liion: 55, naion: 50, pumped: 45, graphite: 70 };
  const temps: Record<StorageId, number> = { flywheel: 30, liion: 27, naion: 26, pumped: 22, graphite: 180 };
  const h = hourOf(t);
  const snap = {
    simTime: t, hour: h, isPeak: false,
    weather: { cloud: CLOUD_BASE, windSpeed: meanWind(h), tempC: ambientTemp(h), irradiance: 0 },
    gen: { solar: 0, wind: 0, hydro: 0, nuclear: 0, geothermal: 0, biomass: 0, thermal: 400 },
    demand: 0, receivers: { homes: 0, industry: 0, commercial: 0, ev: 0, critical: 0 },
    storage: STORAGE.map(s => ({ id: s.id, soc: soc[s.id], power: 0, mode: 'Idle' as const, temp: temps[s.id] })),
    storageNet: 0, tieFlow: 0, curtailed: 0, unserved: 0,
    hvdc: { flow: 0, voltageKV: 800, online: true, losses: 0 },
    hvac: { flow: 0, voltageKV: 400, loading: 0, losses: 0 },
    frequency: 50, telemetryOk: true, renewableShare: 0, netLoad: 0, totalGen: 0,
    decision: { mode: 'BALANCE', action: 'Initialising', reason: 'Warming up simulator', confidence: 0 },
    faults: [], today: emptyTotals(t),
  } satisfies Snapshot;
  return { snap, windSpeed: meanWind(h), cloud: CLOUD_BASE, freqDev: 0, thermal: 400, losses: 60, soc, temps };
}

// ── One simulation step ───────────────────────────────────────────────────────
export function step(prev: SimState, dtMin: number, newFaults: FaultId[] = []): SimState {
  const dtH = dtMin / 60;
  const t = prev.snap.simTime + dtMin * 60000;
  const h = hourOf(t);
  const weekend = isWeekend(t);

  // Faults: tick down, add new ones (restart timer if already active)
  let faults = prev.snap.faults.map(f => ({ ...f, ticksLeft: f.ticksLeft - 1 })).filter(f => f.ticksLeft > 0);
  for (const id of newFaults) {
    faults = faults.filter(f => f.id !== id);
    faults.push({ id, ticksLeft: FAULTS.find(f => f.id === id)!.ticks });
  }
  const has = (id: FaultId) => faults.some(f => f.id === id);
  const started = (id: FaultId) => newFaults.includes(id);

  // Weather (Ornstein–Uhlenbeck random walks)
  const tempC = ambientTemp(h) + noise() * 0.6;
  const cloudTarget = has('cloud_event') ? 0.88 : CLOUD_BASE;
  const cloud = clamp(prev.cloud + 0.25 * (cloudTarget - prev.cloud) + noise() * 0.06, 0, 1);
  const windTarget = has('wind_lull') ? 1.5 : meanWind(h);
  const windSpeed = clamp(prev.windSpeed + 0.3 * (windTarget - prev.windSpeed) + noise() * 0.9, 0, 30);
  const irradiance = 1000 * clearSky(h) * (1 - 0.75 * cloud);

  // Variable + baseload generation
  let solar = solarMW(h, cloud, tempC) * (1 + noise() * 0.02);
  let wind = windMW(windSpeed);
  let curtailed = 0;
  const hvdcOnline = !has('hvdc_trip');
  if (!hvdcOnline && solar + wind > HVDC_TRIP_RE_LIMIT) {
    const excess = solar + wind - HVDC_TRIP_RE_LIMIT;
    curtailed += excess;
    const k = HVDC_TRIP_RE_LIMIT / (solar + wind);
    solar *= k; wind *= k;
  }
  const nuclear = 475 + noise() * 4;
  const geothermal = 54 + noise() * 1;
  let hydro = 120;   // run-of-river minimum
  let biomass = 84;  // minimum stable

  // Demand
  const surge = has('demand_surge') ? 1.15 : 1;
  const demand = demandMW(h, weekend, tempC) * surge * (1 + noise() * 0.012);
  const isPeak = h >= 17.5 && h < 23;
  const nightCharge = h < 5.5 || h >= 23.5;

  // Storage working copies
  const soc = { ...prev.soc };
  const temps = { ...prev.temps };
  const power: Record<StorageId, number> = { flywheel: 0, liion: 0, naion: 0, pumped: 0, graphite: 0 };
  const liionDerated = temps.liion > 45;
  const limit = (id: StorageId) => DEF[id].power * (id === 'liion' && liionDerated ? 0.3 : 1);

  const charge = (ids: StorageId[], mw: number) => {
    let left = mw;
    for (const id of ids) {
      if (left <= 0) break;
      if (power[id] < 0) continue;
      const p = Math.min(left, chargeHeadroomMW(id, soc[id], dtH, limit(id) - Math.max(0, power[id])));
      power[id] += p; left -= p;
    }
    return mw - left;
  };
  const discharge = (ids: StorageId[], mw: number, minSoc?: number) => {
    let left = mw;
    for (const id of ids) {
      if (left <= 0) break;
      if (power[id] > 0) continue;
      const p = Math.min(left, dischargeAvailMW(id, soc[id], dtH, limit(id) + Math.min(0, power[id]), minSoc ?? DEF[id].reserve));
      power[id] -= p; left -= p;
    }
    return mw - left;
  };

  // Night-time charging at low demand (cheap off-peak energy)
  const nightLoad = nightCharge ? charge(['pumped', 'naion'], soc.pumped < 70 ? 220 : 0) : 0;

  // ── AI dispatch ─────────────────────────────────────────────────────────────
  const need = demand + prev.losses + nightLoad;
  const must = solar + wind + nuclear + geothermal + hydro + biomass;
  const ramp = THERMAL_RAMP * dtMin;
  const tLo = Math.max(THERMAL_MIN, prev.thermal - (isPeak ? 0 : ramp)); // hold thermal commitment through the peak
  const tHi = Math.min(800, prev.thermal + ramp);
  let thermal = tLo;
  let remaining = need - must - tLo;
  let tieFlow = 0;
  let unserved = 0;
  let decision: Decision;

  if (remaining <= 0) {
    // Surplus: store, then export, then curtail
    const surplus = -remaining;
    const stored = charge(['liion', 'naion', 'pumped', 'graphite'], surplus);
    let left = surplus - stored;
    const exported = Math.min(left, TIE_CAP);
    tieFlow = -exported; left -= exported;
    curtailed += left;
    decision = {
      mode: 'CHARGE',
      action: `Charging storage with ${round(stored, 0)} MW renewable surplus`,
      reason: `Generation exceeds demand by ${round(surplus, 0)} MW at low net load. Storing energy now for the evening peak${exported > 1 ? `; exporting ${round(exported, 0)} MW over the tie line` : ''}${left > 1 ? `; curtailing ${round(left, 0)} MW` : ''}.`,
      confidence: 93,
    };
  } else {
    let fromStorage = 0;
    if (isPeak) fromStorage += discharge(['liion', 'naion', 'pumped', 'graphite'], remaining);
    remaining -= fromStorage;
    const hydroFlex = Math.min(remaining, isPeak ? 330 : 160);
    hydro += hydroFlex; remaining -= hydroFlex;
    const bioFlex = Math.min(remaining, 36);
    biomass += bioFlex; remaining -= bioFlex;
    const thermalUp = Math.min(remaining, tHi - tLo);
    thermal += thermalUp; remaining -= thermalUp;
    if (!isPeak && remaining > 0) {
      const opp = discharge(['liion', 'naion', 'pumped'], remaining, 40);
      fromStorage += opp; remaining -= opp;
    }
    if (remaining > 0) { tieFlow = Math.min(remaining, TIE_CAP); remaining -= tieFlow; }
    if (remaining > 0) {
      const emergency = discharge(['graphite', 'pumped', 'liion', 'naion'], remaining, 5);
      fromStorage += emergency; remaining -= emergency;
    }
    if (remaining > 0) unserved = remaining;

    if (unserved > 1) {
      decision = { mode: 'EMERGENCY', action: `Shedding ${round(unserved, 0)} MW of non-critical load`, reason: 'All storage, hydro, thermal ramp and tie-line import exhausted. Critical loads remain protected.', confidence: 97 };
    } else if (isPeak && fromStorage > 1) {
      decision = { mode: 'DISCHARGE', action: `Discharging ${round(fromStorage, 0)} MW from storage for peak demand`, reason: `Evening peak (${round(demand, 0)} MW). Storage shaves the peak so thermal stays at ${round(thermal, 0)} MW instead of ramping to the limit.`, confidence: 90 };
    } else if (thermalUp > 1) {
      decision = { mode: 'RAMP', action: `Ramping thermal +${round(thermalUp, 0)} MW`, reason: `Net load rising (${round(need - solar - wind, 0)} MW). Storage reserved for the peak window; dispatchable hydro at ${round(hydro, 0)} MW.`, confidence: 86 };
    } else {
      decision = { mode: 'BALANCE', action: 'Holding balanced dispatch', reason: `Supply matches demand with hydro at ${round(hydro, 0)} MW and thermal at ${round(thermal, 0)} MW. Storage held for the peak.`, confidence: 82 };
    }
  }

  // ── Frequency & flywheel response ───────────────────────────────────────────
  let shock = 0;
  if (started('hvdc_trip')) shock -= 0.32;
  if (started('demand_surge')) shock -= 0.14;
  if (started('cloud_event')) shock -= 0.06;
  let freqDev = prev.freqDev * 0.5 + noise() * 0.03 + shock - unserved / 2500 + (curtailed > 300 ? 0.01 : 0);
  if (freqDev < -0.02 && soc.flywheel > 15) {
    const p = Math.min(DEF.flywheel.power, -freqDev * 2500);
    const got = discharge(['flywheel'], p, 10);
    freqDev += got / 2500 * 0.6;
  } else if (soc.flywheel < 80) {
    charge(['flywheel'], 15);
  }
  freqDev = clamp(freqDev, -0.7, 0.4);

  // Apply storage power to SOC & temperature
  for (const s of STORAGE) {
    const p = power[s.id];
    const oneWay = Math.sqrt(s.eff);
    const dE = p > 0 ? p * dtH * oneWay : (p * dtH) / oneWay;
    soc[s.id] = clamp(soc[s.id] + (dE / s.energy) * 100, 0, 100);
    if (s.id === 'graphite') temps[s.id] = 120 + soc[s.id] * 6;
    else {
      const target = 24 + 10 * Math.abs(p) / s.power + (tempC - 27) * 0.3 + (s.id === 'liion' && has('liion_overheat') ? 30 : 0);
      temps[s.id] = temps[s.id] + (target - temps[s.id]) * (s.id === 'liion' && has('liion_overheat') ? 0.12 : 0.3);
    }
  }
  const storageNet = Object.values(power).reduce((a, b) => a + b, 0);

  // ── Transmission ────────────────────────────────────────────────────────────
  const remoteRE = solar + wind;
  const hvdcFlow = hvdcOnline ? Math.min(HVDC_CAP, remoteRE) : 0;
  const totalGen = solar + wind + hydro + nuclear + geothermal + biomass + thermal;
  const hvacFlow = Math.max(0, totalGen + Math.max(0, tieFlow) - hvdcFlow);
  const hvdcLoss = hvdcFlow * 0.016 + (hvdcOnline ? 3 : 0);
  const hvacLoss = hvacFlow * 0.032;
  const loading = hvacFlow / HVAC_CAP;
  const hvacKV = 400 * (1 - 0.035 * (loading - 0.55) + noise() * 0.004) - (hvdcOnline ? 0 : 9);
  const hvdcKV = hvdcOnline ? 800 * (1 + noise() * 0.002) : 0;

  // ── Day totals ──────────────────────────────────────────────────────────────
  const prevTotals = prev.snap.today.day === dayKey(t) ? prev.snap.today : emptyTotals(t);
  const renewable = solar + wind + hydro + geothermal + biomass;
  const today: DayTotals = {
    day: prevTotals.day,
    demandMWh: prevTotals.demandMWh + demand * dtH,
    renewableMWh: prevTotals.renewableMWh + renewable * dtH,
    curtailedMWh: prevTotals.curtailedMWh + curtailed * dtH,
    importMWh: prevTotals.importMWh + Math.max(0, tieFlow) * dtH,
    exportMWh: prevTotals.exportMWh + Math.max(0, -tieFlow) * dtH,
    co2AvoidedT: prevTotals.co2AvoidedT + renewable * dtH * CO2_T_PER_MWH,
    peakDemand: Math.max(prevTotals.peakDemand, demand),
    unservedMWh: prevTotals.unservedMWh + unserved * dtH,
  };

  const telemetryOk = !has('pmu_dropout');
  const frequency = telemetryOk ? round(50 + freqDev, 3) : prev.snap.frequency;

  const snap: Snapshot = {
    simTime: t, hour: h, isPeak,
    weather: { cloud: round(cloud, 3), windSpeed: round(windSpeed), tempC: round(tempC), irradiance: Math.round(irradiance) },
    gen: {
      solar: round(solar), wind: round(wind), hydro: round(hydro), nuclear: round(nuclear),
      geothermal: round(geothermal), biomass: round(biomass), thermal: round(thermal),
    },
    demand: round(demand), receivers: receiversFor(h, demand),
    storage: STORAGE.map(s => ({
      id: s.id, soc: round(soc[s.id]), power: round(power[s.id]), temp: round(temps[s.id]),
      mode: s.id === 'liion' && liionDerated ? 'Derated' : power[s.id] > 1 ? 'Charging' : power[s.id] < -1 ? 'Discharging' : 'Idle',
    })),
    storageNet: round(storageNet),
    tieFlow: round(tieFlow), curtailed: round(curtailed), unserved: round(unserved),
    hvdc: { flow: round(hvdcFlow), voltageKV: round(hvdcKV), online: hvdcOnline, losses: round(hvdcLoss) },
    hvac: { flow: round(hvacFlow), voltageKV: telemetryOk ? round(hvacKV) : prev.snap.hvac.voltageKV, loading: round(loading, 3), losses: round(hvacLoss) },
    frequency, telemetryOk,
    renewableShare: round((renewable / Math.max(1, totalGen)) * 100),
    netLoad: round(demand - solar - wind),
    totalGen: round(totalGen),
    decision, faults, today,
  };

  return { snap, windSpeed, cloud, freqDev, thermal, losses: hvdcLoss + hvacLoss, soc, temps };
}

// ── Forecasting (client-side fallback model) ─────────────────────────────────
export interface ForecastPoint { t: number; value: number; lower: number; upper: number; }

export function forecastSolar(fromTime: number, cloudNow: number, hours = 24, stepMin = 30): ForecastPoint[] {
  const pts: ForecastPoint[] = [];
  for (let k = 1; k <= (hours * 60) / stepMin; k++) {
    const t = fromTime + k * stepMin * 60000;
    const hz = (k * stepMin) / 60;
    const h = hourOf(t);
    const cloud = CLOUD_BASE + (cloudNow - CLOUD_BASE) * Math.exp(-hz / 4);
    const value = solarMW(h, cloud, ambientTemp(h));
    const sigma = (0.05 + 0.03 * Math.sqrt(hz)) * 1400 * clearSky(h);
    pts.push({ t, value: round(value), lower: round(Math.max(0, value - 1.64 * sigma)), upper: round(Math.min(1400, value + 1.64 * sigma)) });
  }
  return pts;
}

export function forecastDemand(fromTime: number, hours = 24, stepMin = 30, surge = 1): ForecastPoint[] {
  const pts: ForecastPoint[] = [];
  for (let k = 1; k <= (hours * 60) / stepMin; k++) {
    const t = fromTime + k * stepMin * 60000;
    const hz = (k * stepMin) / 60;
    const h = hourOf(t);
    const s = 1 + (surge - 1) * Math.exp(-hz / 3);
    const value = demandMW(h, isWeekend(t), ambientTemp(h)) * s;
    const sigma = value * (0.012 + 0.007 * Math.sqrt(hz));
    pts.push({ t, value: round(value), lower: round(value - 1.64 * sigma), upper: round(value + 1.64 * sigma) });
  }
  return pts;
}

/** Expected 24 h profile for the duck curve (demand, solar, wind, net load). */
export function dayProfile(simTime: number) {
  const weekend = isWeekend(simTime);
  return Array.from({ length: 49 }, (_, i) => {
    const h = i / 2;
    const demand = demandMW(h, weekend, ambientTemp(h));
    const solar = solarMW(h, CLOUD_BASE, ambientTemp(h));
    const wind = windMW(meanWind(h));
    return { h, demand: round(demand, 0), solar: round(solar, 0), wind: round(wind, 0), net: round(demand - solar - wind, 0) };
  });
}

/** Expected demand at the current moment, used for residual-based anomaly scoring. */
export const expectedDemand = (t: number) => { const h = hourOf(t); return demandMW(h, isWeekend(t), ambientTemp(h)); };
export const expectedSolar = (t: number) => { const h = hourOf(t); return solarMW(h, CLOUD_BASE, ambientTemp(h)); };
