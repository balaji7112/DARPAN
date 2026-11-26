# DARPAN — demo TODO

## Fix
- [x] Untrack `dist/` and `tsconfig.tsbuildinfo`
- [x] Remove dead code (three.js scene, 8 unrouted pages, sceneStore, old OORJA-SYNC logo) and unused deps
- [x] Remove stale Vite proxy to non-existent `localhost:8080` backend
- [ ] Alerts are regenerated every tick → acknowledge/resolve can never stick
- [ ] Sidebar width (232/60) ≠ layout margin (240/64); no mobile layout at all
- [ ] TopBar / pages subscribe to the whole store → full re-render every 3 s
- [ ] Leftover "Smart Campus, Bhopal" / OORJA-SYNC branding and demo creds
- [ ] 1.4 MB main bundle (full ECharts) → tree-shake + split

## Build (grid-scale DARPAN)
- [ ] Grid simulator (MW): solar/wind/hydro/nuclear/geothermal/biomass/thermal, demand peaks, 5 storage techs, AI dispatch, f/V, HVAC+HVDC, accelerated sim clock
- [ ] Command Center: KPIs, generation mix, storage SoC, f/V, duck curve, AI decision
- [ ] Animated SVG energy flow: Generation → AI Control → HVAC/HVDC → Storage → Receivers
- [ ] Generation, Storage, Grid & Transmission pages
- [ ] Forecast page with confidence bands (ML service or client fallback)
- [ ] Early warning: persistent alerts, severity, ack/resolve, predictive warnings, fault injection
- [ ] AI Copilot: rule-based on live state; optional LLM via server-side proxy
- [ ] Printable / downloadable report
- [ ] Mock auth with Operator/Admin roles, protected routes
- [ ] Dark/light theme (dark default)
- [ ] `ml-service/` FastAPI: /forecast, /anomaly (RF, HistGB, IsolationForest on synthetic data)

## Ship
- [ ] `.env.example`, `vercel.json`, Dockerfile for ml-service
- [ ] README: real structure, commands, implemented features, deploy
