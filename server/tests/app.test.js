import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';

describe('platform foundation', () => {
  const app = createApp();

  it('reports liveness without exposing secrets', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.data.service).toBe('vfs-groups-api');
    expect(JSON.stringify(response.body)).not.toContain('JWT');
  });

  it('allows browser requests from the configured frontend origin', async () => {
    const frontendOrigin = new URL(env.CLIENT_URL).origin;
    const response = await request(app).get('/api/v1/health').set('Origin', frontendOrigin);
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(frontendOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects untrusted browser origins without returning an internal error', async () => {
    const response = await request(app).get('/api/v1/health').set('Origin', 'https://untrusted.example');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('calculates an EMI schedule through the backend', async () => {
    const response = await request(app).post('/api/v1/tools/emi').send({ amount: 1_000_000, annualRate: 9, tenureMonths: 120, loanType: 'home' });
    expect(response.status).toBe(200);
    expect(response.body.data.monthlyEmi).toBeGreaterThan(0);
    expect(response.body.data.schedule).toHaveLength(120);
    expect(response.body.data.schedule.at(-1).balance).toBe(0);
  });

  it('rejects invalid calculator input with field errors', async () => {
    const response = await request(app).post('/api/v1/tools/emi').send({ amount: -1, annualRate: 0, tenureMonths: 0 });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('protects role dashboards from anonymous access', async () => {
    const response = await request(app).get('/api/v1/dashboard/admin');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('protects loan referral data from anonymous access', async () => {
    const response = await request(app).get('/api/v1/loan-referrals/mine');
    expect(response.status).toBe(401);
  });

  it('validates chatbot messages before calling the provider', async () => {
    const response = await request(app).post('/api/v1/chat/messages').send({ message: '' });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('keeps customer, contractor, and admin login endpoints separate', async () => {
    for (const portal of ['customer', 'contractor', 'admin']) {
      const response = await request(app).post(`/api/v1/auth/${portal}/login`).send({ identifier: '', password: '' });
      expect(response.status).toBe(422);
    }
  });

  it('reuses the browser CSRF cookie instead of invalidating open tabs', async () => {
    const browser = request.agent(app);
    const first = await browser.get('/api/v1/auth/csrf');
    const second = await browser.get('/api/v1/auth/csrf');
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.csrfToken).toBe(first.body.data.csrfToken);
  });
});
