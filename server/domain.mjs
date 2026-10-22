import { z } from 'zod';
import { catalog } from './catalog.mjs';
export class AppError extends Error { constructor(status, message) { super(message); this.status = status; } }
const lineSchema = z.object({ serviceId: z.string().max(60), quantity: z.number().int().min(1).max(100), rationale: z.string().min(1).max(400) }).strict();
const proposalFields = { title: z.string().min(1).max(120), summary: z.string().min(1).max(1200), assumptions: z.array(z.string().min(1).max(400)).max(10) };
export const proposalSchema = z.discriminatedUnion('scopeStatus', [
  z.object({ scopeStatus: z.literal('ready'), ...proposalFields, items: z.array(lineSchema).min(1).max(12), questions: z.array(z.string()).max(0) }).strict(),
  z.object({ scopeStatus: z.literal('clarification_required'), ...proposalFields, items: z.array(lineSchema).max(0), questions: z.array(z.string().min(1).max(400)).min(1).max(8) }).strict()
]);
export const briefSchema = z.object({ client: z.string().trim().min(1).max(100), brief: z.string().trim().min(20).max(6000) }).strict();
export const editSchema = z.object({ items: z.array(z.object({ serviceId: z.string().max(60), quantity: z.number().int().min(1).max(100) }).strict()).min(1).max(12), resolution: z.string().max(1600).optional() }).strict();
export function priceItems(lines) {
  const seen = new Set();
  const items = lines.map(line => {
    const service = catalog.find(x => x.id === line.serviceId);
    if (!service || seen.has(line.serviceId) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100) throw new AppError(422, 'The quote contains an unknown, duplicate, or invalid service. Please revise it.');
    seen.add(line.serviceId);
    return { ...service, serviceId: service.id, quantity: line.quantity, rationale: line.rationale || 'Adjusted by the merchant.', lineCents: service.unitCents * line.quantity };
  });
  const totalCents = items.reduce((a, b) => a + b.lineCents, 0);
  if (totalCents > 10000000) throw new AppError(422, 'This quote exceeds the prototype limit of $100,000.');
  return { items, totalCents, currency: 'USD' };
}
export function validateProposal(input) { const proposal = proposalSchema.parse(input); return { ...proposal, ...priceItems(proposal.items) }; }
export function decimal(cents) { if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Invalid cents'); return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`; }
export function requirePayable(quote) {
  if (!['APPROVED', 'CHECKOUT'].includes(quote.status)) throw new AppError(409, 'The merchant must approve this quote before checkout.');
  if (Date.now() > Date.parse(quote.expiresAt)) throw new AppError(410, 'This quote has expired. Ask the merchant for a new quote.');
}
export function verifyCapture(order, quote) {
  const units = order.purchase_units;
  if (order.id !== quote.payment.orderId || order.status !== 'COMPLETED' || !Array.isArray(units) || units.length !== 1) throw new AppError(502, 'PayPal has not confirmed a completed payment for this quote.');
  const unit = units[0]; const captures = unit.payments?.captures;
  // PayPal capture responses may omit custom_id; reference_id and the persisted
  // order ID still bind this capture to the exact approved quote.
  if ((unit.custom_id !== undefined && unit.custom_id !== quote.id) || unit.reference_id !== quote.id || !Array.isArray(captures) || captures.length !== 1) throw new AppError(502, 'Payment reference verification failed.');
  const capture = captures[0];
  if (capture.status !== 'COMPLETED' || capture.amount?.currency_code !== quote.currency || capture.amount?.value !== decimal(quote.totalCents) || !capture.id) throw new AppError(502, 'Payment amount or status verification failed.');
  return { captureId: capture.id, amount: capture.amount.value, currency: capture.amount.currency_code, paidAt: capture.create_time || new Date().toISOString() };
}
export function publicQuote(q) {
  const { id, title, summary, client, items, totalCents, currency, assumptions, resolution, status, expiresAt, approvedAt, receipt, provider } = q;
  return { id, title, summary, client, items: items.map(({ rationale, ...rest }) => rest), totalCents, currency, assumptions, resolution, status, expiresAt, approvedAt, receipt, example: provider === 'example' };
}
