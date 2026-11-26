// Vercel serverless function: LLM proxy for the DARPAN copilot.
// The API key stays server-side (ANTHROPIC_API_KEY). Without it this returns 503
// and the frontend falls back to its rule-based engine.
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM = `You are DARPAN Copilot, an advisory assistant for operators of a hybrid HVAC–HVDC renewable smart grid.
Answer using ONLY the live grid state provided in each request. Be concise (under 150 words), concrete, and use numbers from the state.
Use **bold** for key figures; plain text otherwise, no headings or tables.
You are advisory only: recommend actions, never claim to have executed them. Critical control stays with local protection systems and operators.
If the state does not contain what is asked, say so. All data is simulated for a student demo.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'LLM not configured' });

  const { question, gridState, history } = req.body ?? {};
  if (typeof question !== 'string' || !question.trim() || question.length > 1000 || typeof gridState !== 'string' || gridState.length > 8000) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const turns = (Array.isArray(history) ? history : [])
    .filter(t => (t?.role === 'user' || t?.role === 'assistant') && typeof t.content === 'string')
    .slice(-6)
    .map(t => ({ role: t.role, content: t.content.slice(0, 2000) }));
  while (turns.length && turns[0].role !== 'user') turns.shift(); // must start with a user turn

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
      max_tokens: 1024,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [
        ...turns,
        { role: 'user', content: `Live grid state:\n${gridState}\n\nOperator question: ${question}` },
      ],
    });
    if (response.stop_reason === 'refusal') return res.status(200).json({ answer: null });
    const answer = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return res.status(200).json({ answer: answer || null });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'Rate limited' });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ error: `Upstream error ${err.status ?? ''}`.trim() });
    return res.status(500).json({ error: 'Copilot proxy failed' });
  }
}
