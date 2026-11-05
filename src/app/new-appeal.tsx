import { router } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorText, Field, FormScreen, Picker } from '@/components/ui';
import { errorText, useCreateAppeal } from '@/lib/api';
import { setLabel } from '@/lib/dates';
import { useMe } from '@/lib/session';

export default function NewAppeal() {
  const { profile, isAdmin } = useMe();
  const create = useCreateAppeal();
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [details, setDetails] = useState('');
  const [scope, setScope] = useState(String(profile.set_year));
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const amount = Number(target.replace(/[^\d]/g, '')) || 0;
    if (!title.trim() || !amount) return setError('Add a title and a target amount.');
    setError(null);
    try {
      await create.mutateAsync({ set_year: scope === 'all' ? null : profile.set_year, title: title.trim(), target: amount, details: details.trim() || null });
      router.back();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <FormScreen title="Start a donation appeal" onClose={() => router.back()}>
      <Field label="What are you raising for?" value={title} onChangeText={setTitle} maxLength={120} placeholder="e.g. Support for a classmate's surgery" />
      <Field label="Target (₦)" value={target} onChangeText={setTarget} keyboardType="number-pad" placeholder="e.g. 500000" />
      <Field label="Details" value={details} onChangeText={setDetails} multiline maxLength={3000} placeholder="Who it helps and how the money will be used" />
      {isAdmin && <Picker label="For" value={scope} onChange={setScope} options={[{ value: String(profile.set_year), label: setLabel(profile.set_year) }, { value: 'all', label: 'Whole association' }]} />}
      <ErrorText message={error} />
      <Button title="Start appeal" variant="gold" onPress={submit} loading={create.isPending} block />
    </FormScreen>
  );
}
