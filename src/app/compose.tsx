import { router } from 'expo-router';
import { useState } from 'react';

import { DateField } from '@/components/date-field';
import { Button, ErrorText, Field, FormScreen, Picker, Row } from '@/components/ui';
import { errorText, useCreatePost } from '@/lib/api';
import { setLabel, todayISO } from '@/lib/dates';
import { useMe } from '@/lib/session';
import type { PostKind } from '@/lib/types';

export default function Compose() {
  const { profile, isExco, isAdmin } = useMe();
  const create = useCreatePost();
  const [kind, setKind] = useState<PostKind>('news');
  const [scope, setScope] = useState<string>(String(profile.set_year));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [when, setWhen] = useState<string | null>(null);
  const [where, setWhere] = useState('');
  const [error, setError] = useState<string | null>(null);

  const kinds: { value: PostKind; label: string }[] = [
    { value: 'news', label: 'News or update' },
    { value: 'invite', label: 'Invite (wedding, naming, burial, party)' },
    ...(isExco ? [{ value: 'announcement' as const, label: 'Announcement' }] : []),
  ];

  const submit = async () => {
    if (!title.trim()) return setError('Add a headline for your post.');
    setError(null);
    try {
      await create.mutateAsync({
        set_year: scope === 'all' ? null : profile.set_year,
        kind, title: title.trim(), body: body.trim() || null,
        event_date: kind === 'invite' ? when : null, venue: kind === 'invite' ? where.trim() || null : null,
      });
      router.back();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <FormScreen title="New post" onClose={() => router.back()}>
      <Picker label="Type" value={kind} onChange={setKind} options={kinds} />
      {isAdmin && <Picker label="Post to" value={scope} onChange={setScope} options={[{ value: String(profile.set_year), label: setLabel(profile.set_year) }, { value: 'all', label: 'Whole association' }]} />}
      <Field label="Headline" value={title} onChangeText={setTitle} maxLength={140} placeholder="e.g. Congratulations to Bisi on her new role" />
      <Field label="Details" value={body} onChangeText={setBody} maxLength={4000} multiline placeholder="Write the full message" />
      {kind === 'invite' && (
        <Row gap={10} style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <DateField label="When" mode="date" value={when} onChange={setWhen} minimumDate={new Date(todayISO())} optional />
        </Row>
      )}
      {kind === 'invite' && <Field label="Where" value={where} onChangeText={setWhere} maxLength={160} placeholder="Venue" />}
      <ErrorText message={error} />
      <Button title="Post to feed" onPress={submit} loading={create.isPending} block />
    </FormScreen>
  );
}
