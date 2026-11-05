import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Switch, View } from 'react-native';

import { ProfileForm } from '@/components/profile-form';
import { Body, Button, ErrorText, FormScreen, H2, List, ListItem, Notice, Small } from '@/components/ui';
import { callFunction, errorText, useSaveProfile } from '@/lib/api';
import { setLabel } from '@/lib/dates';
import { unregisterPush } from '@/lib/push';
import { useMe } from '@/lib/session';
import { useTheme } from '@/lib/theme';
import type { NotifyPrefs } from '@/lib/types';

const PREFS: { key: keyof NotifyPrefs; label: string; sub: string }[] = [
  { key: 'birthdays', label: 'Birthdays', sub: 'When someone in your set celebrates' },
  { key: 'events', label: 'Events', sub: 'New events and the day before' },
  { key: 'posts', label: 'Posts', sub: 'News, invites and announcements' },
  { key: 'dues', label: 'Dues and payments', sub: 'Monthly reminders and receipts' },
];

export default function ProfileScreen() {
  const t = useTheme();
  const { profile, userId, email, signOut } = useMe();
  const save = useSaveProfile(userId);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const prefs = profile.notify ?? {};

  const setPref = async (key: keyof NotifyPrefs, on: boolean) => {
    try { await save.mutateAsync({ notify: { ...prefs, [key]: on } }); } catch (e) { setError(errorText(e)); }
  };

  const deleteAccount = async () => {
    setDeleting(true); setError(null);
    try {
      await unregisterPush();
      await callFunction('delete-account', {});
      await signOut();
    } catch (e) {
      setError(errorText(e));
      setDeleting(false);
    }
  };

  return (
    <FormScreen title="Your profile" onClose={() => router.back()}>
      {profile.role !== 'member' && (
        <Notice tone="green">
          {profile.role === 'admin'
            ? 'You are an association admin: you can post to the whole association, start association-wide appeals and appoint set excos from Members.'
            : `You are an exco of the ${setLabel(profile.set_year)}: you can connect the set account, check transfers, post announcements and start appeals.`}
        </Notice>
      )}
      <ProfileForm
        initial={profile}
        submitLabel={saved ? 'Saved' : 'Save profile'}
        busy={save.isPending}
        onSubmit={async (p) => {
          setError(null); setSaved(false);
          try { await save.mutateAsync(p); setSaved(true); } catch (e) { setError(errorText(e)); }
        }}
      />

      <H2 style={{ marginTop: 10 }}>Phone notifications</H2>
      <List>
        {PREFS.map((p, i) => (
          <ListItem key={p.key} first={i === 0}>
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: '600' }}>{p.label}</Body>
              <Small>{p.sub}</Small>
            </View>
            <Switch accessibilityLabel={p.label} value={prefs[p.key] !== false} onValueChange={(v) => setPref(p.key, v)}
              trackColor={{ true: t.green, false: t.line }} thumbColor="#FFFFFF" />
          </ListItem>
        ))}
      </List>
      <Small>If notifications don’t arrive, allow them for ICAOSA in your phone’s Settings.</Small>
      <Button title="Open phone settings" variant="ghost" small onPress={() => Linking.openSettings()} />

      <ErrorText message={error} />
      <H2 style={{ marginTop: 10 }}>Account</H2>
      <Small>Signed in as {email}</Small>
      <Button title="Sign out" icon="logout" variant="ghost" onPress={async () => { await unregisterPush(); await signOut(); }} block />
      {confirmDelete ? (
        <View style={{ gap: 10 }}>
          <Notice tone="red">This permanently deletes your ICAOSA account, profile, posts and RSVPs. Payment records stay with your set’s accounts but are no longer linked to you.</Notice>
          <Button title="Delete my account" variant="danger" onPress={deleteAccount} loading={deleting} block />
          <Button title="Keep my account" variant="ghost" onPress={() => setConfirmDelete(false)} block />
        </View>
      ) : (
        <Button title="Delete my account" variant="ghost" onPress={() => setConfirmDelete(true)} block />
      )}
      <Small>Privacy: ICAOSA stores your name, set, birthday (day and month), contact details and payment history to run the association. Card details are handled by Paystack and never stored here.</Small>
    </FormScreen>
  );
}
