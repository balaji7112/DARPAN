# DARPAN — demo TODO

## Fix
- [x] Untrack `dist/` and `tsconfig.tsbuildinfo`
- [x] Remove dead code (three.js scene, 8 unrouted pages, sceneStore, old OORJA-SYNC logo) and unused deps
- [x] Remove stale Vite proxy to non-existent `localhost:8080` backend
- [x] Alerts are regenerated every tick → acknowledge/resolve can never stick
- [x] Sidebar width (232/60) ≠ layout margin (240/64); no mobile layout at all
- [x] TopBar / pages subscribe to the whole store → full re-render every 3 s
- [x] Leftover "Smart Campus, Bhopal" / OORJA-SYNC branding and demo creds
- [x] 1.4 MB main bundle (full ECharts) → tree-shake + split

## Build (grid-scale DARPAN)
- [x] Grid simulator (MW): solar/wind/hydro/nuclear/geothermal/biomass/thermal, demand peaks, 5 storage techs, AI dispatch, f/V, HVAC+HVDC, accelerated sim clock
- [x] Command Center: KPIs, generation mix, storage SoC, f/V, duck curve, AI decision
- [x] Animated SVG energy flow: Generation → AI Control → HVAC/HVDC → Storage → Receivers
- [x] Generation, Storage, Grid & Transmission pages
- [x] Forecast page with confidence bands (ML service or client fallback)
- [x] Early warning: persistent alerts, severity, ack/resolve, predictive warnings, fault injection
- [x] AI Copilot: rule-based on live state; optional LLM via server-side proxy
- [x] Printable / downloadable report
- [x] Mock auth with Operator/Admin roles, protected routes
- [x] Dark/light theme (dark default)
- [x] `ml-service/` FastAPI: /forecast, /anomaly (RF, HistGB, IsolationForest on synthetic data)

## Ship
- [x] `.env.example`, `vercel.json`, Dockerfile for ml-service
- [x] README: real structure, commands, implemented features, deploy

## Left / nice-to-have
- [ ] PostgreSQL persistence for telemetry history (skipped: demo runs in-browser)
- [ ] Real authentication backend (currently mock, client-side)
- [ ] Unit tests for `src/sim` and copilot engine
- [ ] Team to confirm the logo: in-app mark is now an SVG; the old `public/darpan-logo.png` clip-art is kept but unused
