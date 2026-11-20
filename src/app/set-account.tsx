import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';

import { Body, Button, Card, ErrorText, Field, FormScreen, Loading, Notice, Picker, Small } from '@/components/ui';
import { callFunction, errorText, keys, useSets } from '@/lib/api';
import { setLabel } from '@/lib/dates';
import { useMe } from '@/lib/session';
import type { SetConfig } from '@/lib/types';

type Bank = { name: string; code: string };

// Year 0 is the association's own (national) account, used for association-wide appeals.
export default function SetAccount() {
  const { profile, isExco, isAdmin } = useMe();
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const national = scope === 'association';
  const sets = useSets();
  const y = national ? 0 : profile.set_year;

  if (national ? !isAdmin : !isExco) {
    return (
      <FormScreen title="Account" onClose={() => router.back()}>
        <Notice>{national ? 'Only association admins can change ICAOSA’s national account.' : 'Only excos of your set can change its account.'}</Notice>
      </FormScreen>
    );
  }
  if (sets.isLoading) return <Loading />;
  const cfg = sets.data?.find((s) => s.year === y) ?? null;
  return <AccountForm key={cfg?.account_number ?? 'new'} year={y} cfg={cfg} national={national} />;
}

function AccountForm({ year, cfg, national }: { year: number; cfg: SetConfig | null; national: boolean }) {
  const qc = useQueryClient();
  const banks = useQuery({
    queryKey: ['banks'],
    queryFn: () => callFunction<{ banks: Bank[] }>('set-account', { action: 'banks' }).then((r) => r.banks),
    staleTime: 6 * 3600e3,
  });

  const [dues, setDues] = useState(cfg?.dues_amount ? String(cfg.dues_amount) : '');
  const [bank, setBank] = useState<string | null>(cfg?.bank_code ?? null);
  const [acct, setAcct] = useState(cfg?.account_number ?? '');
  const [resolved, setResolved] = useState<string | null>(cfg?.account_name ?? null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookupId = useRef(0);

  // Look up the account name with Paystack once a bank and a full 10-digit number are entered.
  const lookup = async (b: string | null, a: string) => {
    setResolved(b === cfg?.bank_code && a === cfg?.account_number ? cfg?.account_name ?? null : null);
    setError(null);
    if (!b || !/^\d{10}$/.test(a) || (b === cfg?.bank_code && a === cfg?.account_number)) return;
    const id = ++lookupId.current;
    setChecking(true);
    try {
      const r = await callFunction<{ accountName: string }>('set-account', { action: 'resolve', bankCode: b, accountNumber: a });
      if (id === lookupId.current) setResolved(r.accountName);
    } catch (e) {
      if (id === lookupId.current) setError(errorText(e));
    } finally {
      if (id === lookupId.current) setChecking(false);
    }
  };

  const save = async () => {
    setError(null);
    const amount = Number(dues.replace(/[^\d]/g, '')) || 0;
    if (!bank || !/^\d{10}$/.test(acct)) return setError('Choose the bank and enter the 10-digit account number.');
    if (!resolved) return setError('Wait for the account name to appear before saving.');
    setSaving(true);
    try {
      await callFunction('set-account', { action: 'save', scope: national ? 'association' : 'set', duesAmount: amount, bankCode: bank, bankName: banks.data?.find((b) => b.code === bank)?.name ?? cfg?.bank_name, accountNumber: acct });
      await qc.invalidateQueries({ queryKey: keys.sets });
      router.back();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen title={national ? 'ICAOSA national account' : `${setLabel(year)} account & dues`} onClose={() => router.back()}>
      <Body muted>{national
        ? 'Donations to association-wide appeals are paid through Paystack and settle directly into this account, usually the next working day.'
        : 'Members’ dues and donations are paid through Paystack and settle directly into this account, usually the next working day.'}</Body>
      {!national && <Field label="Monthly dues (₦)" value={dues} onChangeText={setDues} keyboardType="number-pad" placeholder="e.g. 2000" />}
      <Picker label="Bank" value={bank} onChange={(b) => { setBank(b); void lookup(b, acct); }} placeholder={banks.isLoading ? 'Loading banks…' : 'Choose the bank'}
        options={(banks.data ?? []).map((b) => ({ value: b.code, label: b.name }))} />
      {banks.isError && <ErrorText message={errorText(banks.error)} />}
      <Field label="Account number" value={acct} keyboardType="number-pad" maxLength={10} placeholder="10-digit NUBAN"
        onChangeText={(v) => { const a = v.replace(/\D/g, '').slice(0, 10); setAcct(a); void lookup(bank, a); }} />
      {checking && <Small>Checking the account with Paystack…</Small>}
      {resolved && !checking && (
        <Card tone="green">
          <Small>Account name</Small>
          <Body style={{ fontWeight: '600' }}>{resolved}</Body>
          <Small>Make sure this is the set’s account before saving.</Small>
        </Card>
      )}
      <ErrorText message={error} />
      <Button title="Save" onPress={save} loading={saving} block />
      <Small>{national
        ? 'Members see this account name when they give to an association-wide appeal.'
        : `Every member of the ${setLabel(year)} sees the bank, account name and number on their Dues page.`}</Small>
    </FormScreen>
  );
}
