import { env } from '../config/env.js';

const endpoint = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
const retryableStatuses = new Set([429, 500, 502, 503, 504]);

export const geminiProvider = {
  name: 'gemini',
  async respond({ message, history = [], knowledge = '' }) {
    if (!env.GEMINI_API_KEY) throw new Error('Gemini is not configured.');
    const models = [...new Set([env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL].filter(Boolean))]; let lastError;
    for (const model of models) {
      try { return await requestModel({ model, message, history, knowledge }); }
      catch (error) {
        lastError = error;
        if (!retryableStatuses.has(error.status) && error.name !== 'TimeoutError') throw error;
        console.warn(JSON.stringify({ level: 'warn', provider: 'gemini', event: 'model_retry', model, status: error.status || error.name }));
      }
    }
    throw lastError || new Error('Gemini could not complete the request.');
  },
};

async function requestModel({ model, message, history, knowledge }) {
  const contents = history.slice(-10).map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] }));
  contents.push({ role: 'user', parts: [{ text: message }] });
  const response = await fetch(endpoint(model), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: `You are the VFS Groups website assistant. Use only the approved service information below. Understand simple, informal, abbreviated, and misspelled user messages, including common Indian English phrasing. Reply in short, plain language without unnecessary financial jargon. Explain services, compare relevant options, answer follow-up questions using conversation history, and guide users through applications, tracking, contact flows, and documents that may be coordinated in person. The website does not accept document uploads; never tell a customer to upload a document online. Never promise approval, rates, returns, claims, or disbursement. Never provide personalized financial advice. Never invent lender policies or expose private data. If the approved information does not answer a question, say what is unknown and direct the user to the official contact flow. Include a disclaimer when discussing eligibility.\n\nAPPROVED KNOWLEDGE:\n${knowledge}` }] },
      contents,
      generationConfig: { maxOutputTokens: 500 },
    }),
    signal: AbortSignal.timeout(9_000),
  });
  const result = await response.json();
  if (!response.ok) { const error = new Error(`Gemini request failed with status ${response.status}: ${result.error?.message || 'Unknown provider error'}`); error.status = response.status; throw error; }
  const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('\n').trim();
  if (!text) throw new Error('Gemini returned no text response.');
  return { provider: 'gemini', model, message: text };
}
