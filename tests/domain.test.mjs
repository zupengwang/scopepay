import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleProposal } from '../server/catalog.mjs';
import { validateProposal, priceItems, decimal, verifyCapture, publicQuote } from '../server/domain.mjs';
test('Catalog pricing produces exact cents and ignores model arithmetic', () => {
  const q = validateProposal(sampleProposal); assert.equal(q.totalCents, 90000); assert.equal(decimal(q.totalCents), '900.00'); assert.equal(decimal(1), '0.01');
  assert.throws(() => validateProposal({ ...sampleProposal, total: 1 }));
});
test('Unknown, duplicate, zero and fractional services are rejected', () => {
  for (const items of [[{ serviceId: 'free-money', quantity: 1 }], [{ serviceId: 'copy', quantity: 0 }], [{ serviceId: 'copy', quantity: 1.2 }], [{ serviceId: 'copy', quantity: 1 }, { serviceId: 'copy', quantity: 1 }]]) assert.throws(() => priceItems(items));
});
test('Clarification state cannot contain priced services, and ready state cannot hide questions', () => {
  const unclear = { ...sampleProposal, scopeStatus: 'clarification_required', items: [], questions: ['How many pages?'] };
  assert.equal(validateProposal(unclear).totalCents, 0);
  assert.throws(() => validateProposal({ ...unclear, items: sampleProposal.items }));
  assert.throws(() => validateProposal({ ...sampleProposal, questions: ['How many pages?'] }));
  assert.throws(() => validateProposal({ ...unclear, questions: [] }));
});
const q = { id: 'q1', currency: 'USD', totalCents: 90000, payment: { orderId: 'ORDER1' } };
const order = () => ({ id: 'ORDER1', status: 'COMPLETED', purchase_units: [{ reference_id: 'q1', custom_id: 'q1', payments: { captures: [{ id: 'CAP1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '900.00' } }] } }] });
test('Only a completed, matching PayPal capture becomes a receipt', () => { assert.equal(verifyCapture(order(), q).captureId, 'CAP1'); });
test('PayPal documented capture shape may omit custom_id while preserving reference_id', () => { const data = order(); delete data.purchase_units[0].custom_id; assert.equal(verifyCapture(data, q).captureId, 'CAP1'); });
for (const [name, mutate] of [
  ['wrong order', o => o.id = 'OTHER'], ['wrong reference', o => o.purchase_units[0].custom_id = 'OTHER'],
  ['wrong amount', o => o.purchase_units[0].payments.captures[0].amount.value = '0.01'],
  ['wrong currency', o => o.purchase_units[0].payments.captures[0].amount.currency_code = 'EUR'],
  ['pending capture', o => o.purchase_units[0].payments.captures[0].status = 'PENDING'],
  ['extra capture', o => o.purchase_units[0].payments.captures.push(o.purchase_units[0].payments.captures[0])]
]) test(`Reject ${name}`, () => { const data = order(); mutate(data); assert.throws(() => verifyCapture(data, q)); });
test('Customer view excludes private brief, payment state secret and provider credentials', () => {
  const quote = publicQuote({ ...q, items: [], brief: 'private', shareToken: 'secret', payment: { state: 'private-state' }, events: [], usage: { inputTokens: 1 } });
  for (const key of ['brief', 'shareToken', 'payment', 'events', 'usage']) assert.equal(key in quote, false);
});
