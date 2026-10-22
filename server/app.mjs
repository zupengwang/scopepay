import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { z, ZodError } from 'zod';
import { catalog, examples, sampleProposal } from './catalog.mjs';
import { AppError, briefSchema, editSchema, priceItems, publicQuote, requirePayable, validateProposal, verifyCapture } from './domain.mjs';

const hash = s => createHash('sha256').update(s).digest();
const equal = (a, b) => timingSafeEqual(hash(String(a)), hash(String(b)));
export function createApp({ store, ai, paypal, origin, adminPassword = '', sessionSecret = randomBytes(32).toString('hex'), dist = resolve('dist') }) {
  const locks = new Map(), limits = new Map();
  const site = new URL(origin);
  const event = (q, type, description) => { q.events.push({ id: randomUUID(), type, description, at: new Date().toISOString() }); q.updatedAt = new Date().toISOString(); };
  function session(req) {
    if (!adminPassword) return true;
    const raw = req.headers.cookie?.split('; ').find(s => s.startsWith('scopepay_session='))?.slice(17);
    if (!raw) return false;
    const [expiry, signature] = raw.split('.');
    return Number(expiry) > Date.now() && signature && equal(signature, createHmac('sha256', sessionSecret).update(expiry).digest('hex'));
  }
  function signSession() { const expiry = String(Date.now() + 8 * 3600 * 1000); return `${expiry}.${createHmac('sha256', sessionSecret).update(expiry).digest('hex')}`; }
  function limit(key, max, period) {
    const now = Date.now(); const row = limits.get(key);
    if (row && row.until > now && row.count >= max) throw new AppError(429, 'Too many requests. Please wait and try again.');
    if (row && row.until > now) row.count++; else limits.set(key, { count: 1, until: now + period });
    if (limits.size > 2000) for (const [key, value] of limits) if (value.until < now) limits.delete(key);
  }
  async function exclusive(key, fn) {
    if (locks.has(key)) throw new AppError(409, 'Another operation is in progress for this quote. Please retry in a moment.');
    locks.set(key, true); try { return await fn(); } finally { locks.delete(key); }
  }
  function json(res, code, data) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); }
  async function body(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw new AppError(415, 'Send JSON data.');
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 24000) throw new AppError(413, 'Request is too large.'); chunks.push(chunk); }
    try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { throw new AppError(400, 'Invalid JSON.'); }
  }
  function find(id) { const q = store.get(id); if (!q) throw new AppError(404, 'Quote not found.'); return q; }
  function shared(token) { const q = store.byToken(token); if (!q || q.status === 'DRAFT') throw new AppError(404, 'This quote is not available.'); return q; }
  function newQuote(input, proposal, provider, meta = {}) {
    const now = new Date().toISOString();
    const q = { id: randomUUID(), shareToken: randomBytes(24).toString('hex'), ...input, ...proposal, provider, ...meta, status: 'DRAFT', revision: 1, createdAt: now, updatedAt: now, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), resolution: '', events: [] };
    event(q, 'created', provider === 'example' ? 'Example walkthrough loaded. No model was called.' : 'AI proposed a scope; the server priced it from the service catalog.'); return store.save(q);
  }
  function finalize(q, order) { q.receipt = verifyCapture(order, q); q.status = 'PAID'; event(q, 'paid', 'PayPal sandbox capture verified against the locked quote amount and reference.'); return store.save(q); }
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      if (req.headers.host !== site.host) throw new AppError(403, 'Unexpected request host.');
      const url = new URL(req.url, origin), path = url.pathname, method = req.method;
      if (!['GET', 'HEAD', 'POST', 'PATCH'].includes(method)) throw new AppError(405, 'Method not allowed.');
      if (path.startsWith('/api/')) {
        const ip = req.socket.remoteAddress || 'unknown'; limit(`requests:${ip}`, 180, 60000);
        if (method !== 'GET' && method !== 'HEAD') {
          if (req.headers.origin && req.headers.origin !== site.origin) throw new AppError(403, 'Request origin is not allowed.');
          if (req.headers['x-scopepay-request'] !== '1') throw new AppError(403, 'Missing request verification header.');
        }
        if (path === '/api/health' && method === 'GET') return json(res, 200, { ok: true });
        if (path === '/api/config' && method === 'GET') return json(res, 200, { aiReady: ai.ready, paypalReady: paypal.ready, sandbox: true, authenticated: Boolean(session(req)), authRequired: Boolean(adminPassword), catalog, examples });
        if (path === '/api/login' && method === 'POST') {
          limit(`login:${ip}`, 8, 60000); const data = z.object({ password: z.string().max(256) }).strict().parse(await body(req));
          if (!adminPassword || !equal(data.password, adminPassword)) throw new AppError(401, 'The workspace password is incorrect.');
          res.setHeader('Set-Cookie', `scopepay_session=${signSession()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${site.protocol === 'https:' ? '; Secure' : ''}`); return json(res, 200, { ok: true });
        }
        if (path === '/api/logout' && method === 'POST') { res.setHeader('Set-Cookie', 'scopepay_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); return json(res, 200, { ok: true }); }
        const customer = path.match(/^\/api\/public\/([a-f0-9]{48})(?:\/(checkout|capture))?$/);
        if (customer) {
          const [, token, action] = customer; const q = shared(token);
          if (!action && method === 'GET') return json(res, 200, { quote: publicQuote(q), paypalReady: paypal.ready });
          if (method !== 'POST') throw new AppError(405, 'Method not allowed.');
          const input = await body(req);
          return await exclusive(q.id, async () => {
            const quote = find(q.id);
            if (action === 'checkout') {
              z.object({}).strict().parse(input); requirePayable(quote);
              if (!paypal.ready) throw new AppError(503, 'PayPal sandbox is not connected yet. Ask the merchant to finish setup.');
              if (quote.payment?.approvalUrl) return json(res, 200, { approvalUrl: quote.payment.approvalUrl });
              if (!quote.payment) { quote.payment = { createKey: randomUUID(), captureKey: randomUUID(), state: randomBytes(24).toString('hex') }; store.save(quote); }
              const order = await paypal.create(quote); Object.assign(quote.payment, order); quote.status = 'CHECKOUT'; event(quote, 'checkout', 'PayPal sandbox checkout opened for the approved amount.'); store.save(quote);
              return json(res, 200, { approvalUrl: order.approvalUrl });
            }
            if (action === 'capture') {
              const data = z.object({ orderId: z.string().min(1).max(80), state: z.string().length(48) }).strict().parse(input);
              if (!quote.payment?.orderId || data.orderId !== quote.payment.orderId || !equal(data.state, quote.payment.state)) throw new AppError(403, 'The payment return does not match this quote.');
              if (quote.status === 'PAID') return json(res, 200, { quote: publicQuote(quote) });
              if (quote.status !== 'CHECKOUT') throw new AppError(409, 'No checkout is awaiting capture.');
              let order = await paypal.getOrder(quote);
              if (order.status !== 'COMPLETED') order = await paypal.capture(quote);
              return json(res, 200, { quote: publicQuote(finalize(quote, order)) });
            }
            throw new AppError(404, 'Endpoint not found.');
          });
        }
        if (!session(req)) throw new AppError(401, 'Sign in to your merchant workspace.');
        if (path === '/api/quotes' && method === 'GET') return json(res, 200, { quotes: store.list() });
        if (path === '/api/quotes' && method === 'POST') {
          limit(`ai:${ip}`, 30, 3600000); const input = briefSchema.parse(await body(req));
          return await exclusive('ai-generation', async () => { const result = await ai.generate(input); return json(res, 201, { quote: newQuote(input, result.proposal, 'ai', { model: result.model, usage: result.usage }) }); });
        }
        if (path === '/api/quotes/example' && method === 'POST') { z.object({}).strict().parse(await body(req)); return json(res, 201, { quote: newQuote({ client: examples[0].client, brief: examples[0].brief }, validateProposal(sampleProposal), 'example') }); }
        const merchant = path.match(/^\/api\/quotes\/([a-f0-9-]{36})(?:\/(approve|reconcile))?$/);
        if (merchant) {
          const [, id, action] = merchant;
          if (!action && method === 'GET') return json(res, 200, { quote: find(id) });
          if (!['PATCH', 'POST'].includes(method)) throw new AppError(405, 'Method not allowed.');
          const input = await body(req);
          return await exclusive(id, async () => {
            const q = find(id);
            if (!action && method === 'PATCH') {
              if (q.status !== 'DRAFT') throw new AppError(409, 'Approved quotes are locked. Create a new quote to change the scope.');
              const data = editSchema.parse(input); Object.assign(q, priceItems(data.items)); q.resolution = data.resolution || ''; q.revision++; event(q, 'revised', 'Merchant updated the scope; amounts were recalculated from the catalog.'); store.save(q); return json(res, 200, { quote: q });
            }
            if (action === 'approve' && method === 'POST') {
              const data = z.object({ resolution: z.string().trim().max(1600), accepted: z.literal(true) }).strict().parse(input);
              if (q.status !== 'DRAFT') throw new AppError(409, 'This quote has already been approved.');
              if (!q.items.length || q.totalCents <= 0) throw new AppError(422, 'Add at least one service before approving.');
              if (q.questions.length && data.resolution.length < 15) throw new AppError(422, 'Record how you resolved the open questions before approving.');
              if (Date.now() > Date.parse(q.expiresAt)) throw new AppError(410, 'This draft has expired. Create a new quote.');
              q.resolution = data.resolution; q.status = 'APPROVED'; q.approvedAt = new Date().toISOString(); event(q, 'approved', 'Merchant reviewed the scope and locked the quote for customer checkout.'); store.save(q); return json(res, 200, { quote: q, checkoutUrl: `${origin}/q/${q.shareToken}` });
            }
            if (action === 'reconcile' && method === 'POST') {
              z.object({}).strict().parse(input);
              if (q.status === 'PAID') return json(res, 200, { quote: q });
              if (q.status !== 'CHECKOUT' || !q.payment?.orderId) throw new AppError(409, 'No PayPal order to reconcile yet.');
              return json(res, 200, { quote: finalize(q, await paypal.getOrder(q)) });
            }
            throw new AppError(405, 'Method not allowed.');
          });
        }
        throw new AppError(404, 'Endpoint not found.');
      }
      if (method !== 'GET' && method !== 'HEAD') throw new AppError(405, 'Method not allowed.');
      let target = resolve(dist, '.' + decodeURIComponent(path));
      if (!target.startsWith(dist + sep) && target !== dist) throw new AppError(403, 'Access denied.');
      if (path.split('/').some(s => s.startsWith('.'))) throw new AppError(404, 'Not found.');
      const info = await stat(target).catch(() => null);
      if (!info?.isFile()) { if (extname(path)) throw new AppError(404, 'Not found.'); target = resolve(dist, 'index.html'); }
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }[extname(target)] || 'application/octet-stream';
      const bytes = await readFile(target); res.writeHead(200, { 'Content-Type': mime }); res.end(method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      const status = error instanceof ZodError ? 422 : error.status || (error.name === 'TimeoutError' ? 504 : 500);
      const message = error instanceof ZodError ? 'Some fields are invalid. Check the input and try again.' : status >= 500 && !(error instanceof AppError) ? 'The service could not finish this request. Please try again.' : error.message;
      if (!res.headersSent) json(res, status, { error: message }); else res.end();
    }
  };
}
