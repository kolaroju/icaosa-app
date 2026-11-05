import { router } from 'expo-router';
import { useEffect } from 'react';

import { ReminderRow } from '@/components/reminder-row';
import { EmptyState, FormScreen, List, Small } from '@/components/ui';
import { seenStore } from '@/lib/reminders';
import { useMe } from '@/lib/session';
import { useReminders } from '@/lib/use-reminders';

export default function Notifications() {
  const { userId } = useMe();
  const { list, seen } = useReminders();

  // Opening this screen marks everything here as read.
  useEffect(() => {
    if (list.length) seenStore.markSeen(userId, list.map((r) => r.key));
  }, [list, userId]);

  return (
    <FormScreen title="Notifications" onClose={() => router.back()}>
      {list.length ? (
        <List>{list.map((r, i) => <ReminderRow key={r.key} r={r} first={i === 0} unread={!seen.has(r.key)} onNavigate={() => router.back()} />)}</List>
      ) : (
        <EmptyState title="You're all caught up" body="Birthdays in your set, events in the next two weeks, dues reminders and payment confirmations appear here." />
      )}
      <Small>You also get these as phone notifications. Choose which ones in your profile.</Small>
    </FormScreen>
  );
}
