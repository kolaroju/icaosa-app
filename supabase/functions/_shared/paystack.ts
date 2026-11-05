// Paystack API helpers. https://paystack.com/docs/api/
import { admin, env, HttpError, naira, setLabel, MONTHS } from './core.ts';
import { notify, sendToUsers } from './push.ts';

const BASE = 'https://api.paystack.co';

export async function paystack<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${env('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  let body: { status?: boolean; message?: string; data?: T } = {};
  try {
    body = await res.json();
  } catch { /* non-JSON */ }
  if (!res.ok || body.status === false) {
    console.error('Paystack error', path, res.status, body.message);
    throw new HttpError(res.status >= 500 ? 502 : 400, body.message || 'Paystack could not complete the request.');
  }
  return body.data as T;
}

/** Constant-time check of the x-paystack-signature header (HMAC SHA512 of the raw body). */
export async function validSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env('PAYSTACK_SECRET_KEY')),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'],
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

type VerifiedTransaction = {
  status: string; // 'success' | 'failed' | 'abandoned' | ...
  reference: string;
  amount: number; // kobo
  currency: string;
  channel?: string;
  paid_at?: string;
};

/**
 * Checks a transaction with Paystack and, if it succeeded for the expected
 * amount, marks the payment confirmed and notifies the payer and set excos.
 * Safe to call more than once for the same reference.
 */
export async function settle(reference: string, known?: VerifiedTransaction): Promise<'confirmed' | 'pending' | 'failed'> {
  const { data: pay, error } = await admin().from('payments').select('*').eq('reference', reference).maybeSingle();
  if (error) throw error;
  if (!pay) throw new HttpError(404, 'We could not find that payment.');
  if (pay.status === 'confirmed') return 'confirmed';

  const tx = known ?? await paystack<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (tx.status === 'failed') {
    await admin().from('payments').update({ status: 'failed' }).eq('id', pay.id).neq('status', 'confirmed');
    return 'failed';
  }
  if (tx.status !== 'success') return 'pending';
  if (tx.currency !== 'NGN' || tx.amount !== pay.amount * 100) {
    console.error('Amount mismatch', reference, tx.amount, pay.amount);
    throw new HttpError(409, 'The amount paid does not match this payment. Contact your set treasurer.');
  }

  const { data: updated, error: upErr } = await admin().from('payments')
    .update({ status: 'confirmed', paid_at: tx.paid_at ?? new Date().toISOString(), paystack_channel: tx.channel ?? null })
    .eq('id', pay.id).neq('status', 'confirmed').select('id');
  if (upErr) throw upErr;
  if (!updated?.length) return 'confirmed'; // someone else confirmed it first

  // Tell the payer and the people who look after the money.
  const what = pay.kind === 'dues'
    ? `dues for ${(pay.months as string[]).map((m) => MONTHS[Number(m.slice(5)) - 1].slice(0, 3) + ' ' + m.slice(0, 4)).join(', ')}`
    : 'donation';
  if (pay.user_id) {
    await sendToUsers([pay.user_id], {
      title: 'Payment received',
      body: `Your ${naira(pay.amount)} ${what} has been received. Thank you!`,
      data: { screen: '/dues' },
    });
  }
  const { data: payer } = pay.user_id
    ? await admin().from('profiles').select('full_name').eq('id', pay.user_id).maybeSingle()
    : { data: null };
  let excoQuery = admin().from('profiles').select('id');
  excoQuery = pay.set_year === null
    ? excoQuery.eq('role', 'admin')
    : excoQuery.or(`role.eq.admin,and(role.eq.exco,set_year.eq.${pay.set_year})`);
  const { data: excos } = await excoQuery;
  const excoIds = (excos ?? []).map((e) => e.id as string).filter((id) => id !== pay.user_id);
  if (excoIds.length) {
    await notify({ userIds: excoIds }, 'dues', {
      title: `${setLabel(pay.set_year)}: new payment`,
      body: `${payer?.full_name ?? 'A member'} paid ${naira(pay.amount)} (${what}) by Paystack.`,
      data: { screen: '/dues' },
    });
  }
  return 'confirmed';
}
