import { useEffect, useMemo, useState } from 'react';
import { useGrid } from '../store/gridStore';
import { forecastDemand, forecastSolar } from '../sim/model';
import { fetchForecast, ML_ENABLED, type MLForecast } from './mlClient';

export type ForecastSource = 'ml' | 'client';
const BUCKET = 30 * 60_000;

/** 24 h solar + demand forecast. Uses the ML service when reachable, else the client model. */
export function useForecast() {
  const simTime = useGrid(s => s.snap.simTime);
  const cloud = useGrid(s => s.snap.weather.cloud);
  const surge = useGrid(s => (s.snap.faults.some(f => f.id === 'demand_surge') ? 1.15 : 1));
  const bucket = Math.floor(simTime / BUCKET) * BUCKET;
  const [ml, setMl] = useState<MLForecast | null>(null);
  const [mlStatus, setMlStatus] = useState<'disabled' | 'loading' | 'online' | 'offline'>(ML_ENABLED ? 'loading' : 'disabled');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const client = useMemo(() => ({ solar: forecastSolar(bucket, cloud), demand: forecastDemand(bucket, 24, 30, surge) }), [bucket, surge]);

  useEffect(() => {
    if (!ML_ENABLED) return;
    let cancelled = false;
    fetchForecast(bucket, cloud).then(res => {
      if (cancelled) return;
      setMl(res);
      setMlStatus(res ? 'online' : 'offline');
    });
    return () => { cancelled = true; };
  }, [bucket]); // eslint-disable-line react-hooks/exhaustive-deps

  const useMl = ml && ml.solar.length > 0 && Math.abs(ml.solar[0].t - client.solar[0].t) < BUCKET;
  return {
    solar: useMl ? ml.solar : client.solar,
    demand: useMl ? (surge > 1 ? client.demand : ml.demand) : client.demand,
    source: (useMl ? 'ml' : 'client') as ForecastSource,
    models: useMl ? ml.models : { solar: 'Physics + persistence (client)', demand: 'Seasonal profile (client)' },
    metrics: useMl ? ml.metrics : undefined,
    mlStatus,
  };
}
