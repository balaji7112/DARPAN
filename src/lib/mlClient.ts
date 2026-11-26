// Client for the optional DARPAN ML service (ml-service/, FastAPI).
// Every call degrades to `null` so the UI can fall back to client-side models.
import type { ForecastPoint } from '../sim/model';

const BASE = (import.meta.env.VITE_ML_API_URL || '').replace(/\/$/, '');
export const ML_ENABLED = BASE.length > 0;

export interface MLForecast {
  solar: ForecastPoint[];
  demand: ForecastPoint[];
  models: { solar: string; demand: string };
  metrics?: Record<string, number>;
}

async function post<T>(path: string, body: unknown, timeoutMs = 6000): Promise<T | null> {
  if (!ML_ENABLED) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchForecast(startTs: number, cloudNow: number, hours = 24, stepMin = 30) {
  return post<MLForecast>('/forecast', {
    start_ts: startTs, hours, step_min: stepMin, cloud_now: cloudNow, tz_offset_min: new Date().getTimezoneOffset(),
  });
}

export interface AnomalyFeatures { frequency: number; voltage_kv: number; demand_residual_pct: number; solar_residual_pct: number; hvac_loading: number; }

export function fetchAnomaly(features: AnomalyFeatures) {
  return post<{ score: number; is_anomaly: boolean; model: string }>('/anomaly', features, 4000);
}
