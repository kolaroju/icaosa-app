import { router } from 'expo-router';
import { useState } from 'react';

import { DateField } from '@/components/date-field';
import { Button, ErrorText, Field, FormScreen, Picker } from '@/components/ui';
import { errorText, useCreateEvent } from '@/lib/api';
import { setLabel } from '@/lib/dates';
import { useMe } from '@/lib/session';

export default function NewEvent() {
  const { profile, isAdmin } = useMe();
  const create = useCreateEvent();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [details, setDetails] = useState('');
  const [scope, setScope] = useState(String(profile.set_year));
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || !date) return setError('Add the event name and date.');
    setError(null);
    try {
      await create.mutateAsync({
        set_year: scope === 'all' ? null : profile.set_year,
        title: title.trim(), starts_on: date, start_time: time, venue: venue.trim() || null, details: details.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <FormScreen title="New event" onClose={() => router.back()}>
      <Field label="Event" value={title} onChangeText={setTitle} maxLength={140} placeholder="e.g. Set meeting, reunion, Bayo's wedding" />
      <DateField label="Date" mode="date" value={date} onChange={setDate} minimumDate={new Date()} />
      <DateField label="Time (optional)" mode="time" value={time} onChange={setTime} optional />
      <Field label="Venue" value={venue} onChangeText={setVenue} maxLength={160} placeholder="e.g. School hall, Ibadan, or Zoom" />
      <Field label="Details" value={details} onChangeText={setDetails} maxLength={3000} multiline placeholder="Agenda, dress code, contact person" />
      {isAdmin && <Picker label="For" value={scope} onChange={setScope} options={[{ value: String(profile.set_year), label: setLabel(profile.set_year) }, { value: 'all', label: 'Whole association' }]} />}
      <ErrorText message={error} />
      <Button title="Add event" onPress={submit} loading={create.isPending} block />
    </FormScreen>
  );
}
