import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiConfig, createAI } from '../server/ai.mjs';
import { createPayPal } from '../server/paypal.mjs';
import { sampleProposal } from '../server/catalog.mjs';
import { validateProposal } from '../server/domain.mjs';
test('AI adapter uses a structured tool and validates the result', async () => {
  let call; const ai = createAI({ key: 'test-key', base: 'https://model.example/v1/', model: 'test-model' }, async (url, init) => { call = { url, ...init }; return Response.json({ model: 'test-model', content: [{ type: 'tool_use', name: 'propose_quote', input: sampleProposal }], stop_reason: 'tool_use' }); });
  const result = await ai.generate({ client: 'Test', brief: 'One landing page, copy and five social graphics.' });
  assert.equal(result.proposal.totalCents, 90000); assert.equal(call.url, 'https://model.example/v1/messages'); assert.equal(JSON.parse(call.body).tool_choice.name, 'propose_quote'); assert.equal(JSON.parse(JSON.parse(call.body).messages[0].content).catalog[0].unitCents, undefined);
});
test('AI truncation and hallucinated service fail without a fabricated fallback', async () => {
  for (const output of [{ content: [], stop_reason: 'max_tokens' }, { content: [{ type: 'tool_use', name: 'propose_quote', input: { ...sampleProposal, items: [{ serviceId: 'made-up', quantity: 1, rationale: 'invented' }] } }] }]) {
    const ai = createAI({ key: 'test', base: 'https://model.example', model: 'test' }, async () => Response.json(output)); await assert.rejects(ai.generate({ client: 'Test', brief: 'test' }));
  }
});
test('Local Qwen JSON completion uses the same price validation without sending credentials', async () => {
  let call;
  const ai = createAI({ api: 'openai', base: 'http://127.0.0.1:4182/v1/', model: 'local-qwen' }, async (url, init) => {
    call = { url, ...init };
    return Response.json({ model: 'local-qwen', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(sampleProposal) } }], usage: { prompt_tokens: 300, completion_tokens: 100 } });
  });
  assert.equal(ai.ready, true);
  const result = await ai.generate({ client: 'Test', brief: 'One landing page, copy and five graphics.' });
  assert.equal(result.proposal.totalCents, 90000);
  assert.equal(call.url, 'http://127.0.0.1:4182/v1/chat/completions');
  assert.equal(call.headers.Authorization, undefined);
  const payload = JSON.parse(call.body);
  assert.equal(payload.response_format.type, 'json_schema');
  assert.deepEqual(JSON.parse(payload.messages.at(-1).content), { client: 'Test', brief: 'One landing page, copy and five graphics.' });
  assert(!payload.messages[0].content.includes('unitCents'));
  assert.deepEqual(result.usage, { inputTokens: 300, outputTokens: 100 });
});
test('OpenAI-compatible adapter rejects truncation, invalid JSON, refusal and invented services', async () => {
  const cases = [
    { finish_reason: 'length', message: { content: JSON.stringify(sampleProposal) } },
    { finish_reason: 'stop', message: { content: 'not JSON' } },
    { finish_reason: 'stop', message: { content: JSON.stringify(sampleProposal), refusal: 'refused' } },
    { finish_reason: 'stop', message: { content: JSON.stringify({ ...sampleProposal, items: [{ serviceId: 'invented', quantity: 1, rationale: 'invalid' }] }) } }
  ];
  for (const choice of cases) {
    const ai = createAI({ api: 'openai', base: 'http://127.0.0.1:4182', model: 'local-qwen' }, async () => Response.json({ choices: [choice] }));
    await assert.rejects(ai.generate({ client: 'Test', brief: 'test' }));
  }
});
test('Local provider configuration does not inherit unrelated Anthropic secrets', () => {
  const config = aiConfig({ SCOPEPAY_AI_API: 'openai', SCOPEPAY_AI_BASE_URL: 'http://127.0.0.1:4182', SCOPEPAY_AI_MODEL: 'local-qwen', ANTHROPIC_AUTH_TOKEN: 'unrelated-secret', ANTHROPIC_MODEL: 'other-model' });
  assert.equal(config.key, undefined);
  assert.equal(config.model, 'local-qwen');
  assert.equal(createAI(config).ready, true);
  assert.equal(createAI({ ...config, base: 'https://model.example' }).ready, false);
  assert.throws(() => aiConfig({ SCOPEPAY_AI_API: 'unknown' }));
  assert.throws(() => aiConfig({ SCOPEPAY_AI_TIMEOUT_MS: 'NaN' }));
});
test('PayPal uses sandbox OAuth and persisted idempotency keys with exact totals', async () => {
  const calls = []; const paypal = createPayPal({ clientId: 'fake-id', secret: 'fake-secret', origin: 'https://studio.example' }, async (url, init) => { calls.push({ url, ...init }); return url.endsWith('/token') ? Response.json({ access_token: 'fake-access', expires_in: 300 }) : Response.json({ id: 'ORDER1', links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER1' }] }); });
  const quote = { ...validateProposal(sampleProposal), id: 'quote-id', shareToken: 'share-token', payment: { createKey: 'persisted-key', state: 'return-state' } };
  await paypal.create(quote); await paypal.create(quote);
  assert.equal(calls.length, 3); assert(calls.every(c => c.url.startsWith('https://api-m.sandbox.paypal.com/'))); assert.equal(calls[1].headers['PayPal-Request-Id'], 'persisted-key');
  const payload = JSON.parse(calls[1].body); assert.equal(payload.purchase_units[0].amount.value, '900.00'); assert.equal(payload.purchase_units[0].custom_id, quote.id); assert.equal(payload.payment_source.paypal.experience_context.user_action, 'PAY_NOW'); assert.equal(payload.payment_source.paypal.experience_context.shipping_preference, 'NO_SHIPPING');
});
test('Unexpected payment redirect is blocked', async () => {
  const paypal = createPayPal({ clientId: 'fake', secret: 'fake', origin: 'https://studio.example' }, async url => url.endsWith('/token') ? Response.json({ access_token: 'fake', expires_in: 300 }) : Response.json({ id: 'ORDER', links: [{ rel: 'payer-action', href: 'https://attacker.example/' }] }));
  await assert.rejects(paypal.create({ ...validateProposal(sampleProposal), id: 'test', shareToken: 'test', payment: { state: 'test', createKey: 'test' } }));
});
