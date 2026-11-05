import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { Button, ErrorText, Eyebrow, Field, FormScreen, Notice, Picker, Segmented, Small } from '@/components/ui';
import { errorText, useAppeals, useMyPayments, useRecordTransfer, useSets } from '@/lib/api';
import { MON, monthKey, naira, setLabel, todayISO } from '@/lib/dates';
import { useMe } from '@/lib/session';
import { font, useTheme } from '@/lib/theme';

const THIS_YEAR = new Date().getFullYear();

// For members who paid straight into the set account. An exco confirms it
// once they see the money.
export default function RecordTransfer() {
  const t = useTheme();
  const { profile, userId } = useMe();
  const sets = useSets();
  const mine = useMyPayments(userId);
  const appeals = useAppeals();
  const record = useRecordTransfer();
  const dues = sets.data?.find((s) => s.year === profile.set_year)?.dues_amount ?? 0;

  const [kind, setKind] = useState<'dues' | 'donation'>('dues');
  const [months, setMonths] = useState<string[]>([]);
  const [appeal, setAppeal] = useState('');
  const [amount, setAmount] = useState('');
  const [ref, setRef] = useState('');
  const [paidOn, setPaidOn] = useState<string | null>(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const taken = new Set((mine.data ?? []).filter((p) => p.kind === 'dues' && ['pending', 'confirmed'].includes(p.status)).flatMap((p) => p.months));
  const typed = Math.round(Number(amount.replace(/[^\d]/g, '')) || 0);
  const total = kind === 'dues' && !amount ? months.length * dues : typed;
  const open = (appeals.data ?? []).filter((a) => !a.closed);

  const submit = async () => {
    setError(null);
    if (kind === 'dues' && !months.length) return setError('Tick the months this transfer covers.');
    if (!total) return setError('Enter the amount you transferred.');
    const ap = kind === 'donation' && appeal ? open.find((a) => a.id === appeal) : null;
    try {
      await record.mutateAsync({
        user_id: userId, set_year: ap ? ap.set_year : profile.set_year, kind,
        months: kind === 'dues' ? months : [], appeal_id: ap?.id ?? null, amount: total,
        paid_on: paidOn, note: note.trim() || null, reference: ref.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <FormScreen title="Record a bank transfer" onClose={() => router.back()}>
      <Notice>Use this only if you paid directly into the set’s bank account. Your set treasurer will confirm it once they see the money.</Notice>
      <Segmented value={kind} onChange={setKind} options={[{ value: 'dues', label: 'Dues' }, { value: 'donation', label: 'Donation' }]} />
      {kind === 'dues' ? (
        <View style={{ gap: 8 }}>
          <Eyebrow>Months this covers ({THIS_YEAR})</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {MON.map((m, i) => {
              const k = monthKey(THIS_YEAR, i);
              const isTaken = taken.has(k);
              const on = months.includes(k);
              return (
                <Pressable key={k} disabled={isTaken} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: isTaken }}
                  onPress={() => setMonths((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k].sort()))}
                  style={{ width: '22%', flexGrow: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: on ? t.green : t.line, backgroundColor: on ? t.green : t.surface, opacity: isTaken ? 0.4 : 1 }}>
                  <Text style={{ fontFamily: font.semi, color: on ? t.onGreen : t.ink }}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
          {dues > 0 && <Small>{naira(dues)} per month · {naira(months.length * dues)} for {months.length} month{months.length === 1 ? '' : 's'}</Small>}
        </View>
      ) : (
        <Picker label="Given towards" value={appeal} onChange={setAppeal}
          options={[{ value: '', label: `General ${setLabel(profile.set_year)} fund` }, ...open.map((a) => ({ value: a.id, label: a.title }))]} />
      )}
      <Field label="Amount transferred (₦)" value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder={kind === 'dues' && months.length ? String(months.length * dues) : '0'} />
      <Field label="Transfer reference" value={ref} onChangeText={setRef} placeholder="From your bank alert" maxLength={60} />
      <DateField label="Date paid" mode="date" value={paidOn} onChange={setPaidOn} maximumDate={new Date()} />
      <Field label="Note (optional)" value={note} onChangeText={setNote} maxLength={200} placeholder="e.g. Paid from my wife's account" />
      <ErrorText message={error} />
      <Button title={`Record ${naira(total)} transfer`} onPress={submit} loading={record.isPending} block />
    </FormScreen>
  );
}
