import { useMemo } from 'react';

import { useEvents, useMembers, useMyPayments, usePosts, useSets } from './api';
import { buildReminders, seenStore } from './reminders';
import { useMe } from './session';

/** The member's current reminders and how many are unread. */
export function useReminders() {
  const { profile, userId } = useMe();
  const members = useMembers();
  const events = useEvents();
  const posts = usePosts();
  const payments = useMyPayments(userId);
  const sets = useSets();

  return useMemo(() => {
    const list = buildReminders({
      me: profile,
      members: members.data ?? [],
      events: events.data ?? [],
      posts: posts.data ?? [],
      payments: payments.data ?? [],
      sets: sets.data ?? [],
      postsSeenAt: seenStore.postsSeenAt(userId),
    });
    const seen = seenStore.keys(userId);
    return { list, seen, unread: list.filter((r) => !seen.has(r.key)).length };
  }, [profile, members.data, events.data, posts.data, payments.data, sets.data, userId]);
}
