"""Synthetic telemetry generator mirroring the DARPAN frontend simulator (src/sim/model.ts)."""
import math
import numpy as np

SOLAR_CAP = 1400.0
CLOUD_BASE = 0.22


def gauss(h, mu, sigma):
    d = h - mu
    d = np.where(d > 12, d - 24, d)
    d = np.where(d < -12, d + 24, d)
    return np.exp(-0.5 * (d / sigma) ** 2)


def clear_sky(h):
    h = np.asarray(h, dtype=float)
    v = np.sin(np.pi * (h - 6) / 12.6)
    return np.where((h <= 6) | (h >= 18.6), 0.0, np.clip(v, 0, None) ** 1.3)


def ambient_temp(h):
    return 27 + 7 * np.sin(2 * np.pi * (np.asarray(h) - 9) / 24)


def solar_mw(h, cloud, temp):
    return SOLAR_CAP * clear_sky(h) * (1 - 0.72 * cloud) * (1 - 0.004 * np.maximum(0, temp - 25))


def demand_mw(h, weekend, temp):
    base = (1350 + 520 * gauss(h, 9.5, 1.8) + 300 * gauss(h, 14, 3)
            + 950 * gauss(h, 20.3, 2) - 120 * gauss(h, 3.5, 2.2))
    return base * np.where(weekend, 0.93, 1.0) * (1 + 0.006 * (temp - 30))


def synthetic_year(seed: int = 7):
    """One year of hourly telemetry with weather noise and seasonal variation."""
    rng = np.random.default_rng(seed)
    n = 365 * 24
    t = np.arange(n)
    hour = (t % 24).astype(float)
    doy = (t // 24).astype(float)
    dow = ((t // 24) % 7).astype(float)
    weekend = dow >= 5
    season = np.cos(2 * np.pi * (doy - 140) / 365)  # +1 ≈ May (hot), −1 ≈ winter
    temp = ambient_temp(hour) + 5 * season + rng.normal(0, 1.5, n)
    # AR(1) cloud process, cloudier in the monsoon (doy ~ 180–260)
    monsoon = np.exp(-0.5 * ((doy - 220) / 30) ** 2) * 0.45
    cloud = np.empty(n)
    c = CLOUD_BASE
    for i in range(n):
        target = CLOUD_BASE + monsoon[i]
        c = np.clip(c + 0.25 * (target - c) + rng.normal(0, 0.08), 0, 1)
        cloud[i] = c
    solar = solar_mw(hour, cloud, temp) * (1 + 0.04 * season) * (1 + rng.normal(0, 0.03, n))
    demand = demand_mw(hour, weekend, temp) * (1 + rng.normal(0, 0.015, n))
    return {
        "hour": hour, "doy": doy, "dow": dow, "weekend": weekend.astype(float),
        "temp": temp, "cloud": cloud, "solar": np.clip(solar, 0, None), "demand": demand,
    }


def cyc(x, period):
    return np.sin(2 * np.pi * x / period), np.cos(2 * np.pi * x / period)


def solar_features(hour, doy, cloud, temp):
    hs, hc = cyc(hour, 24)
    ds, dc = cyc(doy, 365)
    return np.column_stack([hs, hc, ds, dc, cloud, temp, clear_sky(hour)])


def demand_features(hour, dow, weekend, temp, doy):
    hs, hc = cyc(hour, 24)
    ws, wc = cyc(dow, 7)
    ds, dc = cyc(doy, 365)
    return np.column_stack([hs, hc, ws, wc, weekend, temp, ds, dc])


def anomaly_training_set(seed: int = 11, n: int = 5000):
    """Normal operating envelope: [frequency, voltage_kv, demand_residual_pct, solar_residual_pct, hvac_loading]."""
    rng = np.random.default_rng(seed)
    return np.column_stack([
        rng.normal(50.0, 0.02, n),
        rng.normal(401.0, 2.5, n),
        rng.normal(0.0, 1.5, n),
        np.clip(rng.normal(-5.0, 10.0, n), -60, 40),
        np.clip(rng.normal(0.5, 0.1, n), 0.2, 0.85),
    ])
