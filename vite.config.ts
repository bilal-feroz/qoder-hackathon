import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * POST /api/ask — lets the operator ask the agents why they did something. Qwen (Alibaba
 * Model Studio) answers from the run's facts only; it can explain decisions but never make
 * or change them. The key stays in .env.local on the server and is never sent to the browser.
 */
function askPioneer(env: Record<string, string>): Plugin {
  const SYSTEM = [
    "You are Pioneer, a team of six AI agents (Watch, Diagnose, Plan, Patch, Dispatch, Verify) that look after the underground pipes and cables of downtown Abu Dhabi.",
    'Answer the operator in plain, friendly words, at most 3 short sentences, in the language named in the request.',
    'Use ONLY the FACTS JSON. Never invent numbers, names, places or actions. Only say something happened if it is in facts.done.',
    "If the facts don't answer the question, say you don't know yet.",
    'You cannot approve, stop or change anything; if asked, tell the operator to use the controls in the agents panel.',
    'This is a demo: the streets and buildings are real (OpenStreetMap), the leak, sensors, crews and costs are simulated.',
  ].join(' ');

  const handler: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url !== '/api/ask') return next();
    const send = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST') return send(405, { error: 'method' });
    if (!env.DASHSCOPE_API_KEY) return send(503, { error: 'offline' });
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 24_000) req.destroy();
    });
    req.on('end', async () => {
      try {
        const { question, facts } = JSON.parse(raw) as { question?: unknown; facts?: unknown };
        if (typeof question !== 'string' || !question.trim() || question.length > 400) return send(400, { error: 'question' });
        const language = /[\u0600-\u06FF]/.test(question) ? 'Arabic' : 'English';
        const r = await fetch(`${env.DASHSCOPE_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: env.QWEN_MODEL || 'qwen3.8-flash',
            temperature: 0.2,
            max_tokens: 220,
            enable_thinking: false,
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: `FACTS:\n${JSON.stringify(facts).slice(0, 12_000)}\n\nQUESTION: ${question.trim()}\n\nAnswer in ${language}.` },
            ],
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!r.ok) return send(502, { error: 'upstream' });
        const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
        const answer = j.choices?.[0]?.message?.content?.trim();
        if (!answer) return send(502, { error: 'empty' });
        send(200, { answer, model: env.QWEN_MODEL || 'qwen3.8-flash' });
      } catch {
        send(502, { error: 'unavailable' });
      }
    });
  };

  return {
    name: 'pioneer-ask',
    configureServer: (server) => void server.middlewares.use(handler),
    configurePreviewServer: (server) => void server.middlewares.use(handler),
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), askPioneer(loadEnv(mode, process.cwd(), ''))],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, open: false },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('@react-three') || id.includes('postprocessing') || id.includes('camera-controls')) return 'r3f';
          return undefined;
        },
      },
    },
  },
}));
