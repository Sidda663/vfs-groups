import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

describe('Gemini provider resilience', () => {
  it('uses the secondary model when the primary model is overloaded', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    vi.stubEnv('GEMINI_MODEL', 'primary-model');
    vi.stubEnv('GEMINI_FALLBACK_MODEL', 'secondary-model');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: { message: 'High demand' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'A service-aware answer.' }] } }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const { geminiProvider } = await import('../src/providers/gemini.js');
    const result = await geminiProvider.respond({ message: 'Compare two services', knowledge: 'Approved service data' });
    expect(result).toMatchObject({ provider: 'gemini', model: 'secondary-model', message: 'A service-aware answer.' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('primary-model');
    expect(fetchMock.mock.calls[1][0]).toContain('secondary-model');
  });
});
