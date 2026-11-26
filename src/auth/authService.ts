// Client-side mock auth for the demo. Sessions live in localStorage.
// Swap `login()` for a real API call when a backend exists.

export type Role = 'Admin' | 'Operator';
export type Permission = 'acknowledge' | 'resolve' | 'inject_faults' | 'sim_control';

export interface Session { email: string; name: string; role: Role; ts: number; }

const KEY = 'darpan_session';
const TTL = 12 * 60 * 60 * 1000;

export const DEMO_ACCOUNTS: { email: string; password: string; name: string; role: Role }[] = [
  { email: 'admin@darpan.in', password: 'Admin@123', name: 'Grid Admin', role: 'Admin' },
  { email: 'operator@darpan.in', password: 'Operator@123', name: 'Shift Operator', role: 'Operator' },
];

const PERMISSIONS: Record<Role, Permission[]> = {
  Admin: ['acknowledge', 'resolve', 'inject_faults', 'sim_control'],
  Operator: ['acknowledge', 'resolve'],
};

export const can = (role: Role | undefined, p: Permission) => !!role && PERMISSIONS[role].includes(p);

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (!s.role || Date.now() - s.ts > TTL) { localStorage.removeItem(KEY); return null; }
    return s;
  } catch {
    return null;
  }
}

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export async function login(email: string, password: string): Promise<Session> {
  await new Promise(r => setTimeout(r, 500)); // simulate network latency
  const acct = DEMO_ACCOUNTS.find(a => a.email === email.trim().toLowerCase() && a.password === password);
  if (!acct) throw new Error('Invalid email or password.');
  const session: Session = { email: acct.email, name: acct.name, role: acct.role, ts: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* private mode: session lasts for this tab only */ }
  return session;
}
