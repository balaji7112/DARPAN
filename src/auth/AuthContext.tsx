import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getSession, clearSession, login as doLogin, can as canDo, type Session, type Permission } from './authService';

interface AuthValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (p: Permission) => boolean;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getSession());

  const login = useCallback(async (email: string, password: string) => {
    setSession(await doLogin(email, password));
  }, []);
  const logout = useCallback(() => { clearSession(); setSession(null); }, []);
  const can = useCallback((p: Permission) => canDo(session?.role, p), [session]);

  const value = useMemo(() => ({ session, login, logout, can }), [session, login, logout, can]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
