import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../server/app.mjs';
import { createStore } from '../server/store.mjs';
import { sampleProposal } from '../server/catalog.mjs';
import { validateProposal } from '../server/domain.mjs';
async function setup(t, options = {}) {
  const store = createStore(':memory:'); let captured = false, creates = 0, captures = 0;
  const ai = { ready: true, generate: async () => ({ proposal: validateProposal(options.proposal || sampleProposal), model: 'TEST-DOUBLE' }) };
  const order = q => ({ id: q.payment.orderId, status: captured ? 'COMPLETED' : 'APPROVED', purchase_units: [{ reference_id: q.id, custom_id: q.id, payments: { captures: [{ id: 'CAPTURE-TEST', status: 'COMPLETED', amount: { currency_code: 'USD', value: options.badAmount ? '0.01' : (q.totalCents / 100).toFixed(2) } }] } }] });
  const paypal = { ready: options.paypalReady !== false, create: async () => { creates++; return { orderId: 'ORDER-TEST', approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER-TEST' }; }, getOrder: async q => order(q), capture: async q => { captures++; captured = true; return order(q); } };
  let handler; const server = createServer((req, res) => handler(req, res)); await new Promise(r => server.listen(0, '127.0.0.1', r)); const origin = `http://127.0.0.1:${server.address().port}`;
  handler = createApp({ store, ai, paypal, origin, adminPassword: options.password });
  t.after(async () => { await new Promise(r => server.close(r)); store.close(); });
  let cookie = '';
  async function call(path, data, method, extra = {}) { const res = await fetch(origin + '/api' + path, { method: method || (data === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', 'X-ScopePay-Request': '1', Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...extra }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }); if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0]; return { status: res.status, body: await res.json() }; }
  async function create() { return (await call('/quotes', { client: 'Test client', brief: 'Please create a landing page, website copy, and five launch graphics.' })).body.quote; }
  async function approve(q, resolution = '') { return call(`/quotes/${q.id}/approve`, { accepted: true, resolution }); }
  async function checkout(q) { return call(`/public/${q.shareToken}/checkout`, {}); }
  async function capture(q, overrides = {}) { q = store.get(q.id); return call(`/public/${q.shareToken}/capture`, { orderId: q.payment.orderId, state: q.payment.state, ...overrides }); }
  return { store, call, create, approve, checkout, capture, counts: () => ({ creates, captures }) };
}
test('Complete quote → review → checkout → capture workflow is replay-safe', async t => {
  const s = await setup(t), q = await s.create(); assert.equal(q.totalCents, 90000);
  assert.equal((await s.call(`/public/${q.shareToken}`)).status, 404);
  assert.equal((await s.approve(q)).status, 200);
  const publicView = await s.call(`/public/${q.shareToken}`); assert.equal(publicView.status, 200); assert.equal(publicView.body.quote.brief, undefined);
  assert.equal((await s.checkout(q)).status, 200); assert.equal((await s.checkout(q)).status, 200);
  assert.equal((await s.capture(q)).body.quote.status, 'PAID'); assert.equal((await s.capture(q)).body.quote.status, 'PAID');
  assert.deepEqual(s.counts(), { creates: 1, captures: 1 }); assert.equal(s.store.get(q.id).events.filter(e => e.type === 'paid').length, 1);
});
test('Prices cannot be set by the browser and approved quotes cannot be edited', async t => {
  const s = await setup(t), q = await s.create();
  assert.equal((await s.call(`/quotes/${q.id}`, { items: [{ serviceId: 'copy', quantity: 1 }], totalCents: 1 }, 'PATCH')).status, 422);
  const edit = await s.call(`/quotes/${q.id}`, { items: [{ serviceId: 'copy', quantity: 2 }] }, 'PATCH'); assert.equal(edit.body.quote.totalCents, 36000);
  await s.approve(q); assert.equal((await s.call(`/quotes/${q.id}`, { items: [{ serviceId: 'copy', quantity: 1 }] }, 'PATCH')).status, 409);
});
test('Open questions require recorded merchant resolution before approval', async t => {
  const s = await setup(t, { proposal: { ...sampleProposal, scopeStatus: 'clarification_required', items: [], questions: ['How many pages are included?'] } }), q = await s.create();
  assert.equal((await s.call(`/quotes/${q.id}`, { items: [{ serviceId: 'landing', quantity: 1 }] }, 'PATCH')).status, 200);
  assert.equal((await s.approve(q)).status, 422); assert.equal((await s.approve(q, 'Client confirmed one landing page with up to six sections.')).status, 200);
});
test('Empty scope cannot be approved', async t => { const s = await setup(t, { proposal: { ...sampleProposal, scopeStatus: 'clarification_required', items: [], questions: ['Which service do you need?'] } }), q = await s.create(); assert.equal((await s.approve(q)).status, 422); });
test('Expired quotes cannot start payment', async t => { const s = await setup(t), q = await s.create(); await s.approve(q); const saved = s.store.get(q.id); saved.expiresAt = new Date(0).toISOString(); s.store.save(saved); assert.equal((await s.checkout(q)).status, 410); assert.equal(s.counts().creates, 0); });
test('Wrong return state or order ID cannot capture an order', async t => { const s = await setup(t), q = await s.create(); await s.approve(q); await s.checkout(q); assert.equal((await s.capture(q, { state: 'x'.repeat(48) })).status, 403); assert.equal((await s.capture(q, { orderId: 'SOMEONE-ELSES-ORDER' })).status, 403); assert.equal(s.counts().captures, 0); });
test('Mismatched captured amount never marks a quote paid', async t => { const s = await setup(t, { badAmount: true }), q = await s.create(); await s.approve(q); await s.checkout(q); assert.equal((await s.capture(q)).status, 502); assert.equal(s.store.get(q.id).status, 'CHECKOUT'); });
test('Missing PayPal credentials cannot produce a simulated success', async t => { const s = await setup(t, { paypalReady: false }), q = await s.create(); await s.approve(q); assert.equal((await s.checkout(q)).status, 503); assert.equal(s.counts().creates, 0); });
test('Merchant authentication and cross-origin checks protect write operations', async t => {
  const s = await setup(t, { password: 'test-password-12345' });
  assert.equal((await s.call('/quotes')).status, 401); assert.equal((await s.call('/login', { password: 'wrong' })).status, 401);
  assert.equal((await s.call('/login', { password: 'test-password-12345' })).status, 200); assert.equal((await s.call('/quotes')).status, 200);
  assert.equal((await s.call('/quotes/example', {}, 'POST', { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await s.call('/quotes/example', {}, 'POST', { 'X-ScopePay-Request': '' })).status, 403);
  await s.call('/logout', {}); assert.equal((await s.call('/quotes')).status, 401);
});
