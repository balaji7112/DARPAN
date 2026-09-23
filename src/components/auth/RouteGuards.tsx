import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

// ─── Branded session-check loader ────────────────────────────────────────────
function SessionLoader() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #EBF4FF 0%, #F0F9FF 40%, #E8F5E9 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      gap: 20,
    }}>
      {/* Logo mark */}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
        animation: 'os-pulse 2s ease-in-out infinite',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#1E3A5F', letterSpacing: '-0.02em' }}>OORJA-SYNC</div>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>Energy Intelligence Platform</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#6366F1',
            animation: `os-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}/>
        ))}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#94A3B8', letterSpacing: '0.05em' }}>
        Checking secure session…
      </div>
      <style>{`
        @keyframes os-pulse {
          0%,100% { transform: scale(1); box-shadow: 0 8px 24px rgba(99,102,241,0.25); }
          50%      { transform: scale(1.04); box-shadow: 0 10px 30px rgba(99,102,241,0.38); }
        }
        @keyframes os-bounce {
          0%,100% { transform: translateY(0); opacity: 0.4; }
          50%      { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Authenticated  → render children
// Checking       → branded loader
// Unauthenticated→ redirect to /login, preserve intended URL
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location   = useLocation();

  if (status === 'checking') return <SessionLoader />;
  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

// ─── PublicOnlyRoute ──────────────────────────────────────────────────────────
// Unauthenticated or Checking → render children (login page)
// Authenticated               → redirect to dashboard (or intended destination)
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location   = useLocation();
  const from       = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  if (status === 'checking') return <SessionLoader />;
  if (status === 'authenticated') {
    return <Navigate to={from} replace />;
  }
  return <>{children}</>;
}
