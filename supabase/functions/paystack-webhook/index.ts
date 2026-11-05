// Paystack calls this for every payment event. Set this URL as the Webhook URL
// in Paystack: Settings → API Keys & Webhooks.
import { HttpError } from '../_shared/core.ts';
import { settle, validSignature } from '../_shared/paystack.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Use POST', { status: 405 });
  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get('x-paystack-signature')))) {
    return new Response('Invalid signature', { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string; status?: string; amount?: number; currency?: string; channel?: string; paid_at?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }
  if (event.event === 'charge.success' && event.data?.reference) {
    try {
      // Re-check with Paystack rather than trusting the event body alone.
      await settle(event.data.reference);
    } catch (e) {
      // Unknown references (e.g. payments made outside the app) are acknowledged and ignored.
      if (!(e instanceof HttpError && e.status === 404)) {
        console.error('Webhook settle failed', e);
        return new Response('Retry later', { status: 500 });
      }
    }
  }
  return new Response('ok', { status: 200 });
});
