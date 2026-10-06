import {DurableObject} from 'cloudflare:workers';
import crypto from 'node:crypto';
import domain from '../server/domain.cjs';
import api from '../server/api.cjs';
import sqlite from './sqlite.cjs';
import transport from './transport.cjs';
import snapshot from '../server/snapshot.cjs';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
};
function authorize(env, token) {
  if (!env.SETUP_TOKEN || env.SETUP_TOKEN.length < 32) domain.fail('Pengaturan awal terkunci. Atur secret SETUP_TOKEN di Cloudflare terlebih dahulu.', 403);
  const digest = v => crypto.createHash('sha256').update(String(v || '')).digest();
  if (!crypto.timingSafeEqual(digest(token), digest(env.SETUP_TOKEN))) domain.fail('Kode pengaturan awal tidak sesuai.', 403);
}

export class MaralaDatabase extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.store = new domain.Store(new sqlite.CloudDatabase(ctx.storage));
    this.handler = api.createHandler({
      store: this.store, secureCookies: true, setupTokenRequired: true,
      attempts: new sqlite.LoginAttempts(this.store.db),
      authorizeSetup: (_req, data) => authorize(env, data.setupToken)
    });
  }
  async fetch(request) {
    const url = new URL(request.url);
    try {
      const restoring = url.pathname === '/api/cloud/restore';
      const bytes = await transport.readBody(request, restoring ? 32_000_000 : 8_000_000);
      return await this.ctx.blockConcurrencyWhile(async () => {
        this.store.db.beginRequest();
        try {
          if (restoring) {
            if (request.method !== 'POST') domain.fail('Gunakan POST.', 405);
            if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.headers.get('origin') && request.headers.get('origin') !== url.origin)) domain.fail('Origin tidak diizinkan.', 403);
            authorize(this.env, request.headers.get('x-setup-token'));
            if (!request.headers.get('content-type')?.startsWith('application/json')) domain.fail('Gunakan JSON.', 415);
            let data; try { data = JSON.parse(bytes.toString()); } catch { domain.fail('Berkas cadangan tidak valid.'); }
            const result = snapshot.restore(this.store, data);
            return Response.json(result, {headers: {'Cache-Control': 'no-store'}});
          }
          return await transport.dispatch(this.handler, request, bytes);
        } catch (error) {
          return Response.json({error: error.status ? error.message : 'Pemrosesan gagal. Data tidak disimpan.'}, {status: error.status || 500, headers: {'Cache-Control': 'no-store'}});
        } finally {
          this.store.db.endRequest();
        }
      });
    } catch (error) {
      return Response.json({error: error.status ? error.message : 'Permintaan gagal diproses.'}, {status: error.status || 500});
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response;
    if (url.pathname.startsWith('/api/') || url.pathname === '/manifest.webmanifest') {
      // One stable object is the shared database for all admins of this deployment.
      response = await env.MARALA_DB.get(env.MARALA_DB.idFromName('bumm-marala-main')).fetch(request);
    } else {
      response = await env.ASSETS.fetch(request);
    }
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
    if (url.pathname.startsWith('/api/')) headers.set('Cache-Control', 'no-store');
    else headers.set('Cache-Control', 'no-cache');
    return new Response(response.body, {status: response.status, headers});
  }
};
