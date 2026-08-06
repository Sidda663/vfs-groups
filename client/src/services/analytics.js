import { api } from './api.js';

function sessionId() {
  const key = 'vfs_analytics_session'; let value = sessionStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); sessionStorage.setItem(key, value); }
  return value;
}

export function trackEvent(eventType, metadata = {}, path = window.location.pathname) {
  let referrerHost = '';
  try { referrerHost = document.referrer ? new URL(document.referrer).host : ''; } catch { referrerHost = ''; }
  return api.post('/analytics/events', { eventType, path, sessionId: sessionId(), referrerHost, metadata: Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)])) }).catch(() => undefined);
}
