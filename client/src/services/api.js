import axios from 'axios';

export function resolveApiBaseUrl({ isDevelopment = import.meta.env.DEV, configuredUrl = import.meta.env.VITE_API_URL } = {}) {
  if (!isDevelopment) return '/api/v1';
  return configuredUrl || 'http://localhost:5000/api/v1';
}

export const api = axios.create({ baseURL: resolveApiBaseUrl(), withCredentials: true, headers: { Accept: 'application/json' } });

export function resolveRequestPortal(url = '', pathname = typeof window === 'undefined' ? '' : window.location.pathname) {
  for (const portal of ['admin', 'customer', 'contractor']) {
    if (url.includes(`/auth/${portal}/`) || url.includes(`/dashboard/${portal}`) || pathname.startsWith(`/${portal}/`)) return portal;
  }
  if (url.includes('/legal-services/admin') || url.includes('/content/admin')) return 'admin';
  if (url.includes('/payments/admin')) return 'admin';
  if (url.includes('/applications/customer')) return 'customer';
  return undefined;
}

let csrfToken;
let csrfRequest;

function clearCsrfToken() {
  csrfToken = undefined;
  csrfRequest = undefined;
}

export function resetApiSecurityState() {
  clearCsrfToken();
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = api.get('/auth/csrf')
      .then((response) => {
        csrfToken = response.data.data.csrfToken;
        return csrfToken;
      })
      .finally(() => { csrfRequest = undefined; });
  }
  return csrfRequest;
}

api.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase();
  const portal = config.headers?.['x-vfs-portal'] || resolveRequestPortal(config.url);
  if (portal) config.headers['x-vfs-portal'] = portal;
  if (['post', 'put', 'patch', 'delete'].includes(method) && !config.url?.includes('/auth/csrf')) {
    config.headers['x-csrf-token'] = await getCsrfToken();
  }
  return config;
});

let refreshRequest;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const isCsrfFailure = error.response?.status === 403 && error.response?.data?.error?.code === 'CSRF_FAILED';
    if (isCsrfFailure && request && !request._csrfRetry) {
      request._csrfRetry = true;
      clearCsrfToken();
      try {
        await getCsrfToken();
        return api(request);
      } catch {
        return Promise.reject(error);
      }
    }
    const isAuthenticationRequest = request?.url?.includes('/login')
      || request?.url?.includes('/register')
      || request?.url?.includes('/refresh');

    if (error.response?.status !== 401 || request?._sessionRetry || isAuthenticationRequest) {
      return Promise.reject(error);
    }

    request._sessionRetry = true;
    try {
      if (!refreshRequest) {
        const portal = request.headers?.['x-vfs-portal'] || resolveRequestPortal(request.url);
        refreshRequest = api.post('/auth/refresh', undefined, { headers: portal ? { 'x-vfs-portal': portal } : undefined }).finally(() => { refreshRequest = undefined; });
      }
      await refreshRequest;
      return api(request);
    } catch {
      return Promise.reject(error);
    }
  },
);

export function apiMessage(error) {
  return error.response?.data?.error?.message || 'We could not complete the request. Please try again.';
}
