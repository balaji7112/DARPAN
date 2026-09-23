import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import { getSession, saveSession, clearSession, type AuthSession } from './authService';

// ─────────────────────────────────────────────────────────────────────────────
export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  /** Call after a successful login to update context */
  onLoginSuccess: (email: string) => void;
  /** Call on logout — clears session + sets status */
  onLogout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status,  setStatus]  = useState<AuthStatus>('checking');
  const [session, setSession] = useState<AuthSession | null>(null);

  // Check session on mount (and after bfcache restore)
  const checkSession = useCallback(() => {
    const s = getSession();
    if (s) {
      setSession(s);
      setStatus('authenticated');
    } else {
      setSession(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    checkSession();
    // Re-check when the page is restored from bfcache (browser Back)
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) checkSession();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [checkSession]);

  const onLoginSuccess = useCallback((email: string) => {
    saveSession(email);
    setSession(getSession());
    setStatus('authenticated');
  }, []);

  const onLogout = useCallback(() => {
    clearSession();
    setSession(null);
    setStatus('unauthenticated');
  }, []);

  return (
    <AuthContext.Provider value={{ status, session, onLoginSuccess, onLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
