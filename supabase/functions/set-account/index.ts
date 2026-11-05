// Set excos connect their set's bank account and monthly dues.
// The account is checked with Paystack and becomes a Paystack subaccount, so
// members' payments settle directly into the set's own bank account.
import { admin, getProfile, HttpError, isExcoOf, json, readJson, requireUser, serve } from '../_shared/core.ts';
import { paystack } from '../_shared/paystack.ts';

type Body =
  | { action: 'banks' }
  | { action: 'resolve'; bankCode: string; accountNumber: string }
  | { action: 'save'; setYear?: number; duesAmount: number; bankCode?: string; bankName?: string; accountNumber?: string };

type Bank = { name: string; code: string; active: boolean; is_deleted?: boolean | null; type?: string };

let bankCache: { at: number; banks: { name: string; code: string }[] } | null = null;

async function listBanks() {
  if (bankCache && Date.now() - bankCache.at < 6 * 3600e3) return bankCache.banks;
  const res = await fetch('https://api.paystack.co/bank?country=nigeria&currency=NGN&perPage=100&use_cursor=true', {
    headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` },
  });
  const out: Bank[] = [];
  let page = await res.json() as { data: Bank[]; meta?: { next?: string | null } };
  out.push(...(page.data ?? []));
  for (let i = 0; i < 6 && page.meta?.next; i++) {
    const r = await fetch(`https://api.paystack.co/bank?country=nigeria&currency=NGN&perPage=100&use_cursor=true&next=${encodeURIComponent(page.meta.next)}`, {
      headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` },
    });
    page = await r.json();
    out.push(...(page.data ?? []));
  }
  const seen = new Set<string>();
  const banks = out
    .filter((b) => b.active && !b.is_deleted && !seen.has(b.code) && seen.add(b.code))
    .map((b) => ({ name: b.name, code: b.code }))
    .sort((a, b) => a.name.localeCompare(b.name));
  bankCache = { at: Date.now(), banks };
  return banks;
}

async function resolveAccount(bankCode: string, accountNumber: string): Promise<string> {
  if (!/^\d{10}$/.test(accountNumber)) throw new HttpError(400, 'A Nigerian account number (NUBAN) has 10 digits.');
  if (!bankCode) throw new HttpError(400, 'Choose the bank.');
  const r = await paystack<{ account_name: string }>(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`,
  ).catch(() => {
    throw new HttpError(400, 'Paystack could not find that account at that bank. Check the number and bank.');
  });
  return r.account_name;
}

serve(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
  const user = await requireUser(req);
  const me = await getProfile(user.id);
  const body = await readJson<Body>(req);

  if (body.action === 'banks') {
    if (me.role === 'member') throw new HttpError(403, 'Only set excos manage the set account.');
    return json({ banks: await listBanks() });
  }

  if (body.action === 'resolve') {
    if (me.role === 'member') throw new HttpError(403, 'Only set excos manage the set account.');
    return json({ accountName: await resolveAccount(body.bankCode, body.accountNumber) });
  }

  if (body.action === 'save') {
    const setYear = me.role === 'admin' && body.setYear ? Number(body.setYear) : me.set_year;
    if (!isExcoOf(me, setYear)) throw new HttpError(403, `Only excos of the ${setYear} Set can change its account.`);
    const dues = Math.round(Number(body.duesAmount) || 0);
    if (dues < 0 || dues > 10_000_000) throw new HttpError(400, 'Enter monthly dues between ₦0 and ₦10,000,000.');

    const { data: current } = await admin().from('sets').select('*').eq('year', setYear).maybeSingle();
    const update: Record<string, unknown> = { year: setYear, dues_amount: dues, updated_by: user.id, updated_at: new Date().toISOString() };

    const bankChanged = body.accountNumber && body.bankCode &&
      (body.accountNumber !== current?.account_number || body.bankCode !== current?.bank_code || !current?.paystack_subaccount);
    if (bankChanged) {
      const accountName = await resolveAccount(body.bankCode!, body.accountNumber!);
      const { data: settings } = await admin().from('settings').select('association_percent').maybeSingle();
      const sub = {
        business_name: `ICAOSA ${setYear} Set`,
        settlement_bank: body.bankCode,
        bank_code: body.bankCode,
        account_number: body.accountNumber,
        percentage_charge: Number(settings?.association_percent ?? 0),
        description: `Ibadan City Academy Old Students Association, ${setYear} Set`,
      };
      const saved = current?.paystack_subaccount
        ? await paystack<{ subaccount_code: string }>(`/subaccount/${current.paystack_subaccount}`, { method: 'PUT', body: JSON.stringify(sub) })
        : await paystack<{ subaccount_code: string }>('/subaccount', { method: 'POST', body: JSON.stringify(sub) });
      Object.assign(update, {
        bank_code: body.bankCode,
        bank_name: body.bankName ?? null,
        account_number: body.accountNumber,
        account_name: accountName,
        paystack_subaccount: saved.subaccount_code ?? current?.paystack_subaccount,
      });
    }
    const { data, error } = await admin().from('sets').upsert(update).select('*').single();
    if (error) throw error;
    return json({ set: data });
  }

  throw new HttpError(400, 'Unknown action.');
});
