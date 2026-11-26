import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { X, Send, Bot, Sparkles, Info } from 'lucide-react';
import { useUI } from '../../store/uiStore';
import { useGrid } from '../../store/gridStore';
import { answer, describeState } from '../../copilot/engine';
import { askLLM, LLM_ENABLED, type ChatTurn } from '../../copilot/llm';
import { cx } from '../ui/kit';

interface Msg { role: 'user' | 'assistant'; text: string; via?: 'llm' | 'rules'; }

const SUGGESTIONS = ['Why is frequency dropping?', 'When should we discharge storage?', 'What is wrong right now?', 'Explain the duck curve', 'Status summary'];

/** Minimal **bold** + newline renderer (no HTML injection). */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        const parts: ReactNode[] = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) => (p.startsWith('**') && p.endsWith('**') ? <strong key={j} className="font-semibold text-fg">{p.slice(2, -2)}</strong> : p));
        return <p key={i} className={cx(line === '' ? 'h-2' : '', 'leading-relaxed')}>{parts}</p>;
      })}
    </>
  );
}

export default function AICopilot() {
  const setOpen = useUI(s => s.setCopilotOpen);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: "Hi, I'm the **DARPAN Copilot**. I answer from live grid telemetry: frequency, storage dispatch, forecasts, alerts. My recommendations are advisory; operators stay in control.", via: 'rules' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    const history: ChatTurn[] = msgs.slice(1).map(m => ({ role: m.role, content: m.text }));
    setMsgs(m => [...m, { role: 'user', text: q }]);
    setBusy(true);
    const { snap, alerts, history: hist } = useGrid.getState();
    const ctx = { snap, alerts, history: hist };
    let reply: Msg;
    const llm = LLM_ENABLED ? await askLLM(q, describeState(ctx), history) : null;
    if (llm) reply = { role: 'assistant', text: llm, via: 'llm' };
    else {
      if (!LLM_ENABLED) await new Promise(r => setTimeout(r, 350));
      reply = { role: 'assistant', text: answer(q, ctx), via: 'rules' };
    }
    setMsgs(m => [...m, reply]);
    setBusy(false);
  }

  const submit = (e: FormEvent) => { e.preventDefault(); send(input); };

  return (
    <div className="fixed inset-0 z-[60] sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[400px] sm:h-[600px] sm:max-h-[calc(100vh-2rem)] flex flex-col card shadow-2xl overflow-hidden fade-up" role="dialog" aria-label="DARPAN Copilot">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3 bg-surface2/50">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary"><Bot size={18} /></span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">DARPAN Copilot</div>
          <div className="text-[11px] text-muted flex items-center gap-1">
            {LLM_ENABLED ? <><Sparkles size={11} className="text-primary" /> LLM + live grid context</> : <><Info size={11} /> Rule engine on live grid state</>}
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-muted hover:bg-surface2 hover:text-fg" aria-label="Close copilot"><X size={18} /></button>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-3 text-sm">
        {msgs.map((m, i) => (
          <div key={i} className={cx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cx('max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px]', m.role === 'user' ? 'bg-primary text-bg rounded-br-md' : 'bg-surface2 text-fg/90 rounded-bl-md')}>
              {m.role === 'user' ? m.text : <Rich text={m.text} />}
              {m.role === 'assistant' && i > 0 && <div className="mt-1.5 text-[10px] text-muted">{m.via === 'llm' ? 'LLM · advisory' : 'Rule engine · advisory'}</div>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex gap-1 px-2" aria-label="Thinking">
            {[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />)}
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="border-t border-line p-3 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto scroll-thin pb-1">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} disabled={busy} className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted hover:text-fg hover:border-primary/50 disabled:opacity-50">{s}</button>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-2">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about the grid…" className="input" maxLength={500} aria-label="Message" />
          <button type="submit" disabled={busy || !input.trim()} className="btn-primary px-3" aria-label="Send"><Send size={15} /></button>
        </form>
      </div>
    </div>
  );
}
