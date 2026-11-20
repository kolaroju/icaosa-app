// Starts a Paystack checkout for dues or a donation.
// The amount is always worked out here, never trusted from the phone.
import { admin, getProfile, HttpError, json, readJson, requireUser, serve, env, setLabel } from '../_shared/core.ts';
import { paystack } from '../_shared/paystack.ts';

type Body = (
  | { kind: 'dues'; months: string[] }
  | { kind: 'donation'; appealId?: string | null; amount: number }
) & { returnUrl?: string };

/**
 * Where Paystack sends a member back to after paying in the web version.
 * Only the ICAOSA web app's own addresses are allowed (plus WEB_APP_ORIGINS,
 * comma separated, for a custom domain), and localhost for testing.
 */
function webReturnUrl(raw?: string): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new HttpError(400, 'Invalid return address.');
  }
  const extra = (Deno.env.get('WEB_APP_ORIGINS') ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  const ok = (u.protocol === 'https:' && /^icaosa(--[a-z0-9-]+)?\.expo\.app$/.test(u.hostname)) ||
    extra.includes(u.origin) ||
    (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'));
  if (!ok) throw new HttpError(400, 'That return address is not allowed.');
  return u.origin + '/?paystack=1';
}

serve(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
  const user = await requireUser(req);
  if (!user.email) throw new HttpError(400, 'Your account needs an email address for Paystack receipts.');
  const me = await getProfile(user.id);
  const body = await readJson<Body>(req);
  const webReturn = webReturnUrl(body.returnUrl);

  let setYear: number | null = me.set_year;
  let amount = 0;
  let months: string[] = [];
  let appealId: string | null = null;
  let description = '';

  if (body.kind === 'dues') {
    months = [...new Set(body.months ?? [])].sort();
    if (!months.length || months.length > 24 || !months.every((m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m))) {
      throw new HttpError(400, 'Choose between 1 and 24 months to pay for.');
    }
    const now = new Date();
    const maxAhead = `${now.getFullYear() + 1}-12`;
    if (months.some((m) => m < '2000-01' || m > maxAhead)) throw new HttpError(400, 'Those months are outside the dues calendar.');
    const { data: set } = await admin().from('sets').select('dues_amount, paystack_subaccount').eq('year', me.set_year).maybeSingle();
    if (!set?.dues_amount) throw new HttpError(400, `The ${setLabel(me.set_year)} has not set its monthly dues yet.`);
    const { data: clash } = await admin().from('payments').select('months')
      .eq('user_id', user.id).eq('kind', 'dues').in('status', ['pending', 'confirmed']).overlaps('months', months);
    if (clash?.length) throw new HttpError(409, 'Some of those months are already paid or waiting for confirmation.');
    amount = set.dues_amount * months.length;
    description = `${setLabel(me.set_year)} dues (${months.join(', ')})`;
  } else if (body.kind === 'donation') {
    amount = Math.round(Number(body.amount));
    if (!Number.isFinite(amount) || amount < 100 || amount > 50_000_000) {
      throw new HttpError(400, 'Enter an amount between ₦100 and ₦50,000,000.');
    }
    if (body.appealId) {
      const { data: appeal } = await admin().from('appeals').select('id, set_year, title, closed').eq('id', body.appealId).maybeSingle();
      if (!appeal || appeal.closed) throw new HttpError(404, 'That appeal is closed or no longer exists.');
      if (appeal.set_year !== null && appeal.set_year !== me.set_year) throw new HttpError(403, 'That appeal belongs to another set.');
      appealId = appeal.id;
      setYear = appeal.set_year;
      description = `Donation: ${appeal.title}`;
    } else {
      description = `Donation to the ${setLabel(me.set_year)} fund`;
    }
  } else {
    throw new HttpError(400, 'Unknown payment type.');
  }

  // Money is split straight to the receiving account's Paystack subaccount:
  // the set's own account, or for association-wide appeals the ICAOSA
  // national account (stored as year 0). Nothing settles to the operator
  // except the commission below.
  const { data: acct } = await admin().from('sets').select('paystack_subaccount').eq('year', setYear ?? 0).maybeSingle();
  const subaccount: string | null = acct?.paystack_subaccount ?? null;
  if (!subaccount) {
    throw new HttpError(400, setYear === null
      ? "ICAOSA's national account isn't connected yet, so association-wide donations can't be taken. An association admin can connect it in Dues → Treasurer's desk → National account."
      : `The ${setLabel(setYear)} has not connected its bank account yet. Ask your set treasurer to set it up in Dues.`);
  }
  const { data: settings } = await admin().from('settings')
    .select('fees_bearer, association_percent, commission_flat').maybeSingle();

  // Platform commission: goes to the main Paystack account, the set gets the rest.
  // Never more than half the payment, so the set's share always covers Paystack's fee.
  let commission = 0;
  if (subaccount) {
    const pct = Number(settings?.association_percent ?? 0);
    const flat = Number(settings?.commission_flat ?? 0);
    commission = Math.min(Math.round((amount * pct) / 100) + flat, Math.floor(amount / 2));
  }

  const reference = `ICA-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase();
  const { data: row, error } = await admin().from('payments').insert({
    user_id: user.id, set_year: setYear, kind: body.kind, months, appeal_id: appealId,
    amount, method: 'paystack', status: 'initialized', reference, commission,
  }).select('id').single();
  if (error) {
    if (error.message?.includes('already paid')) throw new HttpError(409, 'Some of those months are already paid or waiting for confirmation.');
    throw error;
  }

  const checkout = await paystack<{ authorization_url: string; reference: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      amount: amount * 100, // kobo
      currency: 'NGN',
      reference,
      // Phones come back through paystack-callback (icaosa:// link); the web app to its own page.
      callback_url: webReturn ?? `${env('SUPABASE_URL')}/functions/v1/paystack-callback`,
      ...(subaccount ? { subaccount, bearer: settings?.fees_bearer ?? 'subaccount' } : {}),
      // transaction_charge (in kobo) goes to the main account and overrides the subaccount's default split.
      ...(subaccount && commission > 0 ? { transaction_charge: commission * 100 } : {}),
      metadata: {
        payment_id: row.id,
        user_id: user.id,
        kind: body.kind,
        set_year: setYear,
        cancel_action: webReturn
          ? `${webReturn}&cancelled=1&reference=${reference}`
          : `${env('SUPABASE_URL')}/functions/v1/paystack-callback?reference=${reference}&cancelled=1`,
        custom_fields: [
          { display_name: 'Member', variable_name: 'member', value: me.full_name },
          { display_name: 'Set', variable_name: 'set', value: setLabel(me.set_year) },
          { display_name: 'For', variable_name: 'purpose', value: description },
        ],
      },
    }),
  });

  return json({ authorizationUrl: checkout.authorization_url, reference, amount });
});
