import { create } from 'zustand';
import { initialState, step, type SimState, type Snapshot, type FaultId, type StorageId } from '../sim/model';
import { evaluate, reconcile, type Alert } from '../sim/alerts';

export interface HistPoint {
  t: number; demand: number; net: number; storageNet: number; tie: number;
  solar: number; wind: number; hydro: number; nuclear: number; geothermal: number; biomass: number; thermal: number;
  freq: number; kv: number; renewableShare: number; soc: Record<StorageId, number>;
}

export const SPEEDS = [
  { label: 'Live', minutes: 0.05 },
  { label: '×20', minutes: 1 },
  { label: '×100', minutes: 5 },
  { label: '×300', minutes: 15 },
];

export const TICK_MS = 3000;
const HISTORY_CAP = 288;

function toPoint(s: Snapshot): HistPoint {
  return {
    t: s.simTime, demand: s.demand, net: s.netLoad, storageNet: s.storageNet, tie: s.tieFlow,
    ...s.gen, freq: s.frequency, kv: s.hvac.voltageKV, renewableShare: s.renewableShare,
    soc: Object.fromEntries(s.storage.map(x => [x.id, x.soc])) as Record<StorageId, number>,
  };
}

/** Simulate the previous 24 h so charts are full on first paint. */
function warmup(): { sim: SimState; history: HistPoint[] } {
  let sim = initialState(Date.now() - 24 * 3600_000);
  const history: HistPoint[] = [];
  for (let i = 0; i < HISTORY_CAP; i++) {
    sim = step(sim, 5);
    history.push(toPoint(sim.snap));
  }
  return { sim, history };
}

interface GridStore {
  sim: SimState;
  snap: Snapshot;
  history: HistPoint[];
  alerts: Alert[];
  lastRaised: Alert[];
  tick: number;
  speedMin: number;
  running: boolean;
  advance: (faults?: FaultId[]) => void;
  setSpeed: (minutes: number) => void;
  setRunning: (running: boolean) => void;
  injectFault: (id: FaultId) => void;
  clearFaults: () => void;
  acknowledge: (id: string, by: string) => void;
  resolve: (id: string, by: string) => void;
  reset: () => void;
}

const boot = warmup();

export const useGrid = create<GridStore>()((set, get) => ({
  sim: boot.sim,
  snap: boot.sim.snap,
  history: boot.history,
  alerts: [],
  lastRaised: [],
  tick: 0,
  speedMin: 5,
  running: true,

  advance: (faults = []) => {
    const { sim, history, alerts, tick, speedMin } = get();
    const next = step(sim, speedMin, faults);
    const { alerts: nextAlerts, raised } = reconcile(alerts, evaluate(next.snap), next.snap, tick + 1);
    const h = history.length >= HISTORY_CAP ? history.slice(1) : history.slice();
    h.push(toPoint(next.snap));
    set({ sim: next, snap: next.snap, history: h, alerts: nextAlerts, lastRaised: raised, tick: tick + 1 });
  },

  setSpeed: (minutes) => set({ speedMin: minutes }),
  setRunning: (running) => set({ running }),

  // Apply immediately so the operator sees the effect without waiting a tick.
  injectFault: (id) => get().advance([id]),

  clearFaults: () => {
    const { sim } = get();
    const cleared = { ...sim, snap: { ...sim.snap, faults: [] } };
    set({ sim: cleared, snap: cleared.snap });
  },

  acknowledge: (id, by) => set(s => ({
    alerts: s.alerts.map(a => (a.id === id && a.status === 'active' ? { ...a, status: 'acknowledged' as const, ackBy: by } : a)),
  })),

  resolve: (id, by) => set(s => ({
    alerts: s.alerts.map(a => (a.id === id && a.status !== 'resolved' ? { ...a, status: 'resolved' as const, resolvedBy: by, resolvedAt: Date.now() } : a)),
  })),

  reset: () => {
    const fresh = warmup();
    set({ sim: fresh.sim, snap: fresh.sim.snap, history: fresh.history, alerts: [], lastRaised: [], tick: 0 });
  },
}));
