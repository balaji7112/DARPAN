// Optional LLM path for the copilot. The browser never holds an API key:
// it calls a server-side proxy (api/copilot.js on Vercel) configured via VITE_COPILOT_API_URL.
const URL = import.meta.env.VITE_COPILOT_API_URL || '';
export const LLM_ENABLED = URL.length > 0;

export interface ChatTurn { role: 'user' | 'assistant'; content: string; }

export async function askLLM(question: string, gridState: string, history: ChatTurn[]): Promise<string | null> {
  if (!LLM_ENABLED) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, gridState, history: history.slice(-6) }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { answer?: string };
    return data.answer?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
