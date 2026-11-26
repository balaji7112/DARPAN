import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/RouteGuards';
import AppLayout, { PageSpinner } from './components/layout/AppLayout';
import { useGrid, TICK_MS } from './store/gridStore';
import { useUI } from './store/uiStore';

const LoginPage = lazy(() => import('./pages/Login/LoginPage'));
const CommandCenter = lazy(() => import('./pages/Dashboard/CommandCenter'));
const GenerationPage = lazy(() => import('./pages/Generation/GenerationPage'));
const StoragePage = lazy(() => import('./pages/Storage/StoragePage'));
const GridPage = lazy(() => import('./pages/Grid/GridPage'));
const ForecastPage = lazy(() => import('./pages/Forecast/ForecastPage'));
const EarlyWarningPage = lazy(() => import('./pages/EarlyWarning/EarlyWarningPage'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));
const ArchitecturePage = lazy(() => import('./pages/Architecture/ArchitecturePage'));
const AICopilot = lazy(() => import('./components/ai/AICopilot'));
const CommandPalette = lazy(() => import('./components/ui/CommandPalette'));

/** Drives the telemetry simulator: one tick every 3 s while running. */
function Simulator() {
  const running = useGrid(s => s.running);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => useGrid.getState().advance(), TICK_MS);
    return () => clearInterval(id);
  }, [running]);
  return null;
}

function Shortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useUI.getState().setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}

function Overlays() {
  const palette = useUI(s => s.commandPaletteOpen);
  const copilot = useUI(s => s.copilotOpen);
  return (
    <Suspense fallback={null}>
      {palette && <CommandPalette />}
      {copilot && <AICopilot />}
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Simulator />
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><Suspense fallback={<PageSpinner />}><LoginPage /></Suspense></PublicOnlyRoute>} />
          <Route element={<ProtectedRoute><Shortcuts /><AppLayout /><Overlays /></ProtectedRoute>}>
            <Route path="/dashboard" element={<CommandCenter />} />
            <Route path="/generation" element={<GenerationPage />} />
            <Route path="/storage" element={<StoragePage />} />
            <Route path="/grid" element={<GridPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/early-warning" element={<EarlyWarningPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
