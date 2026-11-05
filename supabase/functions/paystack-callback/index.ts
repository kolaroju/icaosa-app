// Paystack sends the member's browser here after checkout. We hand them
// straight back to the app, which then confirms the payment.
const APP_SCHEME = Deno.env.get('APP_SCHEME') ?? 'icaosa';

Deno.serve((req) => {
  const url = new URL(req.url);
  const reference = url.searchParams.get('reference') ?? url.searchParams.get('trxref') ?? '';
  const target = new URL(`${APP_SCHEME}://payment-complete`);
  if (reference) target.searchParams.set('reference', reference);
  if (url.searchParams.get('cancelled')) target.searchParams.set('cancelled', '1');
  return new Response(null, { status: 302, headers: { Location: target.toString() } });
});
