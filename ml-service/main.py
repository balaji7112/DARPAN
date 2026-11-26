"""DARPAN ML service: solar/demand forecasting and anomaly detection.

Models are trained at startup on synthetic telemetry (a few seconds):
  - Solar:   RandomForestRegressor (interval from per-tree spread)
  - Demand:  HistGradientBoostingRegressor (+ 5%/95% quantile models)
  - Anomaly: IsolationForest over the normal operating envelope
Run:  uvicorn main:app --reload --port 8000
"""
import os
import time
from datetime import datetime, timedelta, timezone
from typing import List

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.ensemble import HistGradientBoostingRegressor, IsolationForest, RandomForestRegressor
from sklearn.metrics import mean_absolute_percentage_error, r2_score

import grid_model as gm

app = FastAPI(title="DARPAN ML Service", version="1.0.0")
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

MODELS = {}
METRICS = {}


def train():
    t0 = time.time()
    d = gm.synthetic_year()
    n = len(d["hour"])
    split = int(n * 0.85)  # last ~8 weeks held out
    Xs = gm.solar_features(d["hour"], d["doy"], d["cloud"], d["temp"])
    Xd = gm.demand_features(d["hour"], d["dow"], d["weekend"], d["temp"], d["doy"])
    ys, yd = d["solar"], d["demand"]

    rf = RandomForestRegressor(n_estimators=80, min_samples_leaf=3, n_jobs=-1, random_state=0).fit(Xs[:split], ys[:split])
    hgb = HistGradientBoostingRegressor(max_iter=300, learning_rate=0.08, random_state=0).fit(Xd[:split], yd[:split])
    lo = HistGradientBoostingRegressor(loss="quantile", quantile=0.05, max_iter=200, random_state=0).fit(Xd[:split], yd[:split])
    hi = HistGradientBoostingRegressor(loss="quantile", quantile=0.95, max_iter=200, random_state=0).fit(Xd[:split], yd[:split])
    iso = IsolationForest(n_estimators=200, contamination=0.01, random_state=0).fit(gm.anomaly_training_set())

    day = d["solar"][split:] > 5
    METRICS.update({
        "solar_r2": round(float(r2_score(ys[split:], rf.predict(Xs[split:]))), 3),
        "solar_mape_day": round(float(mean_absolute_percentage_error(ys[split:][day], rf.predict(Xs[split:][day]))), 3),
        "demand_r2": round(float(r2_score(yd[split:], hgb.predict(Xd[split:]))), 3),
        "demand_mape": round(float(mean_absolute_percentage_error(yd[split:], hgb.predict(Xd[split:]))), 3),
        "train_seconds": round(time.time() - t0, 1),
    })
    MODELS.update({"rf": rf, "hgb": hgb, "lo": lo, "hi": hi, "iso": iso})


train()


class ForecastRequest(BaseModel):
    start_ts: float = Field(..., description="Start time, ms since epoch")
    hours: int = Field(24, ge=1, le=72)
    step_min: int = Field(30, ge=5, le=120)
    cloud_now: float = Field(gm.CLOUD_BASE, ge=0, le=1)
    tz_offset_min: int = Field(0, description="JS Date.getTimezoneOffset() of the client")


class Point(BaseModel):
    t: float
    value: float
    lower: float
    upper: float


class ForecastResponse(BaseModel):
    solar: List[Point]
    demand: List[Point]
    models: dict
    metrics: dict


class AnomalyRequest(BaseModel):
    frequency: float
    voltage_kv: float
    demand_residual_pct: float
    solar_residual_pct: float
    hvac_loading: float


@app.get("/")
@app.get("/health")
def health():
    return {"status": "ok", "models": ["RandomForestRegressor", "HistGradientBoostingRegressor", "IsolationForest"], "metrics": METRICS}


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    steps = req.hours * 60 // req.step_min
    ts = np.array([req.start_ts + (k + 1) * req.step_min * 60_000 for k in range(steps)])
    local = [datetime.fromtimestamp(t / 1000, tz=timezone.utc) - timedelta(minutes=req.tz_offset_min) for t in ts]
    hour = np.array([dt.hour + dt.minute / 60 for dt in local])
    doy = np.array([dt.timetuple().tm_yday - 1 for dt in local], dtype=float)
    dow = np.array([(dt.weekday() + 1) % 7 for dt in local], dtype=float)  # JS convention: 0 = Sunday
    weekend = ((dow == 0) | (dow == 6)).astype(float)
    horizon_h = (np.arange(steps) + 1) * req.step_min / 60
    cloud = gm.CLOUD_BASE + (req.cloud_now - gm.CLOUD_BASE) * np.exp(-horizon_h / 4)
    temp = gm.ambient_temp(hour)

    Xs = gm.solar_features(hour, doy, cloud, temp)
    per_tree = np.stack([t.predict(Xs) for t in MODELS["rf"].estimators_])
    s_mean = per_tree.mean(axis=0)
    s_lo = np.percentile(per_tree, 5, axis=0)
    s_hi = np.percentile(per_tree, 95, axis=0)
    widen = 1 + 0.08 * np.sqrt(horizon_h)  # uncertainty grows with horizon
    s_lo = np.clip(s_mean - (s_mean - s_lo) * widen, 0, gm.SOLAR_CAP)
    s_hi = np.clip(s_mean + (s_hi - s_mean) * widen, 0, gm.SOLAR_CAP)
    night = gm.clear_sky(hour) == 0
    s_mean[night] = s_lo[night] = s_hi[night] = 0

    Xd = gm.demand_features(hour, dow, weekend, temp, doy)
    d_mean = MODELS["hgb"].predict(Xd)
    d_lo = np.minimum(MODELS["lo"].predict(Xd), d_mean) - d_mean * 0.004 * horizon_h
    d_hi = np.maximum(MODELS["hi"].predict(Xd), d_mean) + d_mean * 0.004 * horizon_h

    r = lambda v: round(float(v), 1)  # noqa: E731
    return {
        "solar": [{"t": float(t), "value": r(m), "lower": r(l), "upper": r(h)} for t, m, l, h in zip(ts, s_mean, s_lo, s_hi)],
        "demand": [{"t": float(t), "value": r(m), "lower": r(l), "upper": r(h)} for t, m, l, h in zip(ts, d_mean, d_lo, d_hi)],
        "models": {"solar": "RandomForestRegressor (ML service)", "demand": "HistGradientBoostingRegressor (ML service)"},
        "metrics": METRICS,
    }


@app.post("/anomaly")
def anomaly(req: AnomalyRequest):
    x = np.array([[req.frequency, req.voltage_kv, req.demand_residual_pct, req.solar_residual_pct, req.hvac_loading]])
    decision = float(MODELS["iso"].decision_function(x)[0])  # > 0 normal, < 0 anomalous
    score = 1 / (1 + np.exp(decision * 15))
    return {"score": round(float(score), 3), "is_anomaly": decision < 0, "model": "IsolationForest"}
