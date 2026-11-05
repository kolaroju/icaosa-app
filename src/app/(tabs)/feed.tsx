import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';

import { PostCard } from '@/components/post-card';
import { Button, EmptyState, H1, Row, Screen, Segmented } from '@/components/ui';
import { useDeletePost, useMembers, usePosts } from '@/lib/api';
import { setLabel } from '@/lib/dates';
import { seenStore } from '@/lib/reminders';
import { useMe } from '@/lib/session';

export default function Feed() {
  const { profile, userId, isExco } = useMe();
  const [scope, setScope] = useState<'set' | 'all'>('set');
  const posts = usePosts();
  const members = useMembers();
  const del = useDeletePost();
  const names = new Map((members.data ?? []).map((m) => [m.id, m.full_name]));
  const y = profile.set_year;

  useFocusEffect(useCallback(() => { seenStore.markPostsSeen(userId); }, [userId]));

  const list = (posts.data ?? []).filter((p) => (scope === 'all' ? p.set_year === null : p.set_year === y));

  return (
    <Screen onRefresh={() => posts.refetch()} refreshing={posts.isRefetching}>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Feed</H1>
        <Button title="Post" icon="plus" small onPress={() => router.push('/compose')} />
      </Row>
      <Segmented value={scope} onChange={setScope} options={[{ value: 'set', label: setLabel(y) }, { value: 'all', label: 'Whole association' }]} />
      {list.length ? list.map((p) => (
        <PostCard key={p.id} post={p} authorName={names.get(p.author_id) ?? 'A member'}
          canDelete={p.author_id === userId || (isExco && (p.set_year === y || profile.role === 'admin'))}
          onDelete={() => del.mutate(p.id)} />
      )) : (
        <EmptyState
          title={scope === 'all' ? 'No association-wide posts yet' : "Your set's feed is empty"}
          body={scope === 'all' ? 'Announcements from the ICAOSA national exco appear here.' : 'Post news, a wedding or naming-ceremony invite, or a call for a set meeting.'}
          action={<Button title="Write the first post" icon="plus" small onPress={() => router.push('/compose')} />} />
      )}
    </Screen>
  );
}
