// Paystack calls this for every payment event on the business. Set this URL
// as the Webhook URL in Paystack: Settings → API Keys & Webhooks.
//
// Paystack allows one webhook address per business. If the same Paystack
// business also serves other apps, put their webhook addresses (comma
// separated) in the OTHER_PAYSTACK_WEBHOOKS secret: every event that is not an
// ICAOSA payment is passed on to them unchanged, with Paystack's signature, so
// those apps verify it exactly as if Paystack had called them directly.
import { HttpError } from '../_shared/core.ts';
import { settle, validSignature } from '../_shared/paystack.ts';

const OTHERS = (Deno.env.get('OTHER_PAYSTACK_WEBHOOKS') ?? '')
  .split(',').map((u) => u.trim()).filter((u) => /^https:\/\//.test(u));

/** ICAOSA payment references are created by paystack-init and start with ICA-. */
const isIcaosa = (reference?: string) => !!reference && reference.startsWith('ICA-');

async function forward(raw: string, signature: string): Promise<boolean> {
  if (!OTHERS.length) return true;
  const results = await Promise.allSettled(OTHERS.map((url) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
      body: raw,
      signal: AbortSignal.timeout(15_000),
    })));
  let ok = true;
  results.forEach((r, i) => {
    if (r.status === 'rejected' || !r.value.ok) {
      ok = false;
      console.error('Forward failed', OTHERS[i], r.status === 'rejected' ? String(r.reason) : r.value.status);
    }
  });
  return ok;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Use POST', { status: 405 });
  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature');
  if (!(await validSignature(raw, signature))) {
    return new Response('Invalid signature', { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const reference = event.data?.reference;
  if (!isIcaosa(reference)) {
    // Another app's payment, transfer or other event: pass it on.
    // A failure makes Paystack retry later, so the other app doesn't lose it.
    return (await forward(raw, signature!)) ? new Response('ok') : new Response('Forward failed', { status: 502 });
  }

  if (event.event === 'charge.success') {
    try {
      // Re-check with Paystack rather than trusting the event body alone.
      await settle(reference!);
    } catch (e) {
      if (!(e instanceof HttpError && e.status === 404)) {
        console.error('Webhook settle failed', e);
        return new Response('Retry later', { status: 500 });
      }
    }
  }
  return new Response('ok', { status: 200 });
});
