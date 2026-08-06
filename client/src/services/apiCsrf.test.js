import { AxiosError } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { api, resetApiSecurityState } from './api.js';

const originalAdapter = api.defaults.adapter;

function success(config, data = {}) {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

function header(config, name) {
  return config.headers?.get?.(name) || config.headers?.[name];
}

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  resetApiSecurityState();
});

describe('API CSRF handling', () => {
  it('shares one CSRF fetch between concurrent write requests', async () => {
    let csrfCalls = 0;
    const mutationTokens = [];
    api.defaults.adapter = async (config) => {
      if (config.url === '/auth/csrf') {
        csrfCalls += 1;
        await Promise.resolve();
        return success(config, { data: { csrfToken: 'shared-token' } });
      }
      mutationTokens.push(header(config, 'x-csrf-token'));
      return success(config, { data: { saved: true } });
    };

    await Promise.all([api.post('/first', {}), api.patch('/second', {})]);
    expect(csrfCalls).toBe(1);
    expect(mutationTokens).toEqual(['shared-token', 'shared-token']);
  });

  it('refreshes the token and retries one failed write request', async () => {
    let csrfCalls = 0;
    let mutationCalls = 0;
    const mutationTokens = [];
    api.defaults.adapter = async (config) => {
      if (config.url === '/auth/csrf') {
        csrfCalls += 1;
        return success(config, { data: { csrfToken: csrfCalls === 1 ? 'old-token' : 'fresh-token' } });
      }
      mutationCalls += 1;
      mutationTokens.push(header(config, 'x-csrf-token'));
      if (mutationCalls === 1) {
        const response = { data: { error: { code: 'CSRF_FAILED' } }, status: 403, statusText: 'Forbidden', headers: {}, config };
        throw new AxiosError('CSRF failed', 'ERR_BAD_REQUEST', config, null, response);
      }
      return success(config, { data: { saved: true } });
    };

    const response = await api.patch('/admin/change', {});
    expect(response.data.data.saved).toBe(true);
    expect(csrfCalls).toBe(2);
    expect(mutationCalls).toBe(2);
    expect(mutationTokens).toEqual(['old-token', 'fresh-token']);
  });
});
