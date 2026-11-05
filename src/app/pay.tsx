import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { Body, Button, Card, ErrorText, Eyebrow, Field, FormScreen, H2, Notice, Picker, Row, Small } from '@/components/ui';
import { errorText, keys, useAppeals, useMyPayments, useSets } from '@/lib/api';
import { MON, monthKey, naira, setLabel } from '@/lib/dates';
import { payWithPaystack, type PayResult } from '@/lib/pay';
import { useMe } from '@/lib/session';
import { font, useTheme } from '@/lib/theme';

const THIS_YEAR = new Date().getFullYear();

export default function Pay() {
  const t = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ kind?: string; appeal?: string }>();
  const kind = params.kind === 'donation' ? 'donation' : 'dues';
  const { profile, userId } = useMe();
  const sets = useSets();
  const mine = useMyPayments(userId);
  const appeals = useAppeals();
  const dues = sets.data?.find((s) => s.year === profile.set_year)?.dues_amount ?? 0;

  const [year, setYear] = useState(THIS_YEAR);
  const [months, setMonths] = useState<string[]>([]);
  const [appeal, setAppeal] = useState<string>(params.appeal ?? '');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PayResult | null>(null);

  const taken = new Set((mine.data ?? []).filter((p) => p.kind === 'dues' && ['pending', 'confirmed'].includes(p.status)).flatMap((p) => p.months));
  const total = kind === 'dues' ? months.length * dues : Math.round(Number(amount.replace(/[^\d]/g, '')) || 0);
  const open = (appeals.data ?? []).filter((a) => !a.closed);

  const toggle = (k: string) => setMonths((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k].sort()));

  const pay = async () => {
    setError(null);
    if (kind === 'dues' && !months.length) return setError('Tick the months you want to pay for.');
    if (kind === 'donation' && total < 100) return setError('Enter at least ₦100.');
    setBusy(true);
    try {
      const r = await payWithPaystack(kind === 'dues' ? { kind, months } : { kind, appealId: appeal || null, amount: total });
      setResult(r);
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: keys.appeals });
      qc.invalidateQueries({ queryKey: ['summary'] });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const copy = {
      confirmed: ['Payment received', `Thank you. Your ${naira(total)} ${kind === 'dues' ? 'dues payment' : 'donation'} is confirmed.`],
      pending: ['Payment not finished yet', "If you completed the payment, it will show as received within a few minutes. If you closed the page early, you weren't charged and can try again."],
      failed: ['Payment did not go through', "Your bank declined the payment, so you weren't charged. Try again or use another card."],
      'opened-in-safari': ['Finish your donation in Safari', 'Complete the payment in Safari. You will be brought back to ICAOSA, and your donation will show here once Paystack confirms it.'],
    }[result.status];
    return (
      <FormScreen title={copy[0]} onClose={() => router.back()}>
        <Notice tone={result.status === 'confirmed' ? 'green' : result.status === 'failed' ? 'red' : 'gold'}>{copy[1]}</Notice>
        <Small>Reference: {result.reference}</Small>
        <Button title="Done" onPress={() => router.back()} block />
        {result.status !== 'confirmed' && result.status !== 'opened-in-safari' && <Button title="Try again" variant="ghost" onPress={() => setResult(null)} block />}
      </FormScreen>
    );
  }

  return (
    <FormScreen title={kind === 'dues' ? 'Pay dues' : 'Make a donation'} onClose={() => router.back()}>
      {kind === 'dues' ? (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <Eyebrow>Months to pay for</Eyebrow>
            <Row gap={6}>
              {[THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1].map((yy) => (
                <Pressable key={yy} accessibilityRole="button" accessibilityState={{ selected: yy === year }} onPress={() => setYear(yy)}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: yy === year ? t.ink : t.sunk }}>
                  <Text style={{ fontFamily: font.semi, color: yy === year ? t.bg : t.muted }}>{yy}</Text>
                </Pressable>
              ))}
            </Row>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {MON.map((m, i) => {
              const k = monthKey(year, i);
              const isTaken = taken.has(k);
              const on = months.includes(k);
              return (
                <Pressable key={k} disabled={isTaken} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: isTaken }} accessibilityLabel={`${m} ${year}${isTaken ? ', already paid' : ''}`}
                  onPress={() => toggle(k)}
                  style={{ width: '22%', flexGrow: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: on ? t.green : t.line, backgroundColor: on ? t.green : t.surface, opacity: isTaken ? 0.4 : 1 }}>
                  <Text style={{ fontFamily: font.semi, color: on ? t.onGreen : t.ink }}>{m}{isTaken ? ' ✓' : ''}</Text>
                </Pressable>
              );
            })}
          </View>
          <Small>{naira(dues)} per month for the {setLabel(profile.set_year)}.</Small>
        </>
      ) : (
        <>
          <Picker label="Give towards" value={appeal} onChange={setAppeal}
            options={[{ value: '', label: `General ${setLabel(profile.set_year)} fund` }, ...open.map((a) => ({ value: a.id, label: `${a.title}${a.set_year === null ? ' (Association)' : ''}` }))]} />
          <Field label="Amount (₦)" value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="e.g. 10000" />
          <Row>
            {[5000, 10000, 25000, 50000].map((n) => (
              <Pressable key={n} accessibilityRole="button" onPress={() => setAmount(String(n))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface }}>
                <Text style={{ fontFamily: font.semi, color: t.ink }}>{naira(n)}</Text>
              </Pressable>
            ))}
          </Row>
        </>
      )}

      <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Body muted>Total</Body>
        <H2 style={{ fontSize: 26 }}>{naira(total)}</H2>
      </Card>
      <ErrorText message={error} />
      <Button title={`Pay ${naira(total)} with Paystack`} icon="card" onPress={pay} loading={busy} disabled={!total} block variant={kind === 'donation' ? 'gold' : 'primary'} />
      <Small>
        {Platform.OS === 'ios' && kind === 'donation'
          ? 'Donations open in Safari to complete payment by card, bank transfer or USSD.'
          : 'Paystack opens a secure page where you can pay by card, bank transfer or USSD. Your card details never pass through ICAOSA.'}
      </Small>
    </FormScreen>
  );
}
