// authService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for session management.
// Stores a lightweight token in localStorage.
// Replace the body of `loginWithCredentials` with a real API call when ready.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'oorja_auth';

export interface AuthSession {
  email: string;
  ts: number;
  // Add more fields (userId, role, accessToken) when wiring the real backend
}

// ── Read ─────────────────────────────────────────────────────────────────────
export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    // Treat sessions older than 24 h as expired
    if (Date.now() - session.ts > 24 * 60 * 60 * 1000) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// ── Write ────────────────────────────────────────────────────────────────────
export function saveSession(email: string): void {
  const session: AuthSession = { email, ts: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

// ── Clear ─────────────────────────────────────────────────────────────────────
export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Login ────────────────────────────────────────────────────────────────────
// DEMO MODE: accepts demo credentials OR any valid-format email + 4+ char pw.
// Replace this function body to call your real backend endpoint.
//
// Real backend example:
//   const res = await fetch('/api/auth/login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ email, password }),
//     signal,
//   });
//   if (!res.ok) {
//     if (res.status === 401) throw new AuthError('credentials');
//     throw new AuthError('network');
//   }
//   const { token, user } = await res.json();
//   saveSession(user.email);

export class AuthError extends Error {
  constructor(public kind: 'credentials' | 'network' | 'timeout') {
    super(kind);
  }
}

const DEMO_EMAIL    = 'admin@oorjasync.in';
const DEMO_PASSWORD = 'Demo@2026';

export async function loginWithCredentials(
  email: string,
  password: string,
  signal?: AbortSignal,
): Promise<void> {
  // Simulate network latency for demo
  await new Promise<void>((resolve, reject) => {
    const tid = setTimeout(resolve, 800);
    signal?.addEventListener('abort', () => { clearTimeout(tid); reject(new AuthError('network')); });
  });

  if (signal?.aborted) throw new AuthError('network');

  const emailOk = email.trim().toLowerCase();
  const isDemo  = emailOk === DEMO_EMAIL && password === DEMO_PASSWORD;
  const isAny   = emailOk.includes('@') && emailOk.split('@')[1]?.includes('.') && password.length >= 4;

  if (!isDemo && !isAny) {
    throw new AuthError('credentials');
  }

  saveSession(email.trim());
}

// ── Logout ───────────────────────────────────────────────────────────────────
export function logout(): void {
  clearSession();
}
