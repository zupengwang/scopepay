import { AppError, decimal } from './domain.mjs';
const API = 'https://api-m.sandbox.paypal.com';
export function createPayPal({ clientId, secret, origin }, request = fetch) {
  let token, expires = 0;
  async function accessToken() {
    if (!clientId || !secret) throw new AppError(503, 'PayPal sandbox is not connected yet. Ask the merchant to finish setup.');
    if (token && Date.now() < expires) return token;
    const res = await request(`${API}/v1/oauth2/token`, { method: 'POST', signal: AbortSignal.timeout(20000), headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
    if (!res.ok) throw new AppError(502, `PayPal authentication failed (HTTP ${res.status}). Check the sandbox credentials.`);
    const data = await res.json(); if (!data.access_token) throw new AppError(502, 'PayPal did not return an access token.');
    token = data.access_token; expires = Date.now() + (data.expires_in - 60) * 1000; return token;
  }
  async function api(path, { method = 'GET', body, key } = {}) {
    const auth = await accessToken();
    const res = await request(`${API}${path}`, { method, signal: AbortSignal.timeout(25000), headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(key ? { 'PayPal-Request-Id': key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!res.ok) { if (res.status === 401) { token = null; expires = 0; } throw new AppError(502, `PayPal could not complete this step (HTTP ${res.status}). You can safely retry.`); }
    return res.json();
  }
  return {
    ready: Boolean(clientId && secret),
    async create(quote) {
      const result = await api('/v2/checkout/orders', { method: 'POST', key: quote.payment.createKey, body: {
        intent: 'CAPTURE', purchase_units: [{ reference_id: quote.id, custom_id: quote.id, description: quote.title.slice(0, 127), amount: { currency_code: quote.currency, value: decimal(quote.totalCents), breakdown: { item_total: { currency_code: quote.currency, value: decimal(quote.totalCents) } } }, items: quote.items.map(i => ({ name: i.name, quantity: String(i.quantity), unit_amount: { currency_code: quote.currency, value: decimal(i.unitCents) }, category: 'DIGITAL_GOODS' })) }],
        payment_source: { paypal: { experience_context: { brand_name: 'ScopePay', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW', return_url: `${origin}/q/${quote.shareToken}?checkout=return&state=${quote.payment.state}`, cancel_url: `${origin}/q/${quote.shareToken}?checkout=cancel` } } }
      } });
      const link = result.links?.find(x => x.rel === 'payer-action' || x.rel === 'approve')?.href;
      if (!result.id || !link) throw new AppError(502, 'PayPal did not return a checkout link. Please retry.');
      const url = new URL(link);
      if (url.protocol !== 'https:' || !['www.sandbox.paypal.com', 'sandbox.paypal.com'].includes(url.hostname)) throw new AppError(502, 'PayPal returned an unexpected checkout destination.');
      return { orderId: result.id, approvalUrl: link };
    },
    capture: quote => api(`/v2/checkout/orders/${encodeURIComponent(quote.payment.orderId)}/capture`, { method: 'POST', body: {}, key: quote.payment.captureKey }),
    getOrder: quote => api(`/v2/checkout/orders/${encodeURIComponent(quote.payment.orderId)}`)
  };
}
