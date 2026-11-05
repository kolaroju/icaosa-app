import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { PostCard } from '@/components/post-card';
import { ReminderRow } from '@/components/reminder-row';
import { Button, EmptyState, H1, LinkButton, List, Screen, Section, Small } from '@/components/ui';
import { useDeletePost, useDuesSummary, useEvents, useMembers, usePosts, useSets } from '@/lib/api';
import { firstName, fmtShort, MON, setLabel, thisMonthKey, todayISO } from '@/lib/dates';
import { useMe } from '@/lib/session';
import { font, radius, useTheme } from '@/lib/theme';
import { useReminders } from '@/lib/use-reminders';

export default function Home() {
  const t = useTheme();
  const { profile, userId, isExco } = useMe();
  const members = useMembers();
  const posts = usePosts();
  const events = useEvents();
  const sets = useSets();
  const summary = useDuesSummary(thisMonthKey());
  const del = useDeletePost();
  const { list, seen } = useReminders();

  const y = profile.set_year;
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const dues = sets.data?.find((s) => s.year === y)?.dues_amount ?? 0;
  const next = (events.data ?? []).filter((e) => e.starts_on >= todayISO())[0];
  const setPosts = (posts.data ?? []).filter((p) => p.set_year === y).slice(0, 3);
  const assoc = (posts.data ?? []).filter((p) => p.set_year === null).slice(0, 2);
  const names = new Map((members.data ?? []).map((m) => [m.id, m.full_name]));
  const refreshing = members.isRefetching || posts.isRefetching || events.isRefetching;

  const stats = [
    { value: String(summary.data?.members ?? '—'), label: 'in your set' },
    { value: dues ? `${summary.data?.paid ?? 0}/${summary.data?.members ?? 0}` : '—', label: dues ? `paid for ${MON[new Date().getMonth()]}` : 'dues not set' },
    { value: next ? fmtShort(next.starts_on) : '—', label: next ? 'next event' : 'no events yet' },
  ];

  const postCard = (p: (typeof setPosts)[number]) => (
    <PostCard key={p.id} post={p} authorName={names.get(p.author_id) ?? 'A member'}
      canDelete={p.author_id === userId || (isExco && (p.set_year === y || profile.role === 'admin'))} onDelete={() => del.mutate(p.id)} />
  );

  return (
    <Screen onRefresh={() => { members.refetch(); posts.refetch(); events.refetch(); sets.refetch(); summary.refetch(); }} refreshing={refreshing}>
      <View style={{ gap: 8 }}>
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: t.green, paddingLeft: 12, paddingRight: 18, paddingVertical: 5, borderTopRightRadius: 2, borderBottomRightRadius: 14 }}>
          <Icon name="star" size={15} color={t.onGreen} />
          <Text style={{ fontFamily: font.display, fontSize: 15, color: t.onGreen }}>{setLabel(y)}{profile.role !== 'member' ? ` · ${profile.role === 'admin' ? 'Admin' : 'Exco'}` : ''}</Text>
        </View>
        <H1>{greet}, {firstName(profile.full_name)}.</H1>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {stats.map((s) => (
          <View key={s.label} style={{ flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: radius, padding: 12, gap: 2 }}>
            <Text style={{ fontFamily: font.display, fontSize: 21, color: t.ink, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
            <Small>{s.label}</Small>
          </View>
        ))}
      </View>

      <Section title="Today" action={list.length > 4 ? <LinkButton label="See all" onPress={() => router.push('/notifications')} /> : undefined}>
        {list.length
          ? <List>{list.slice(0, 4).map((r, i) => <ReminderRow key={r.key} r={r} first={i === 0} unread={!seen.has(r.key)} />)}</List>
          : <EmptyState title="Nothing needs you today" body="Birthdays, upcoming events and dues reminders for your set will show here." />}
      </Section>

      <Section title={`From the ${setLabel(y)}`} action={<LinkButton label="Open feed" onPress={() => router.navigate('/feed')} />}>
        {setPosts.length ? setPosts.map(postCard) : (
          <EmptyState title="No news from your set yet" body="Share an update, an invite or a reunion idea to get things going."
            action={<Button title="Write a post" icon="plus" small onPress={() => router.push('/compose')} />} />
        )}
      </Section>

      {assoc.length > 0 && <Section title="Association news">{assoc.map(postCard)}</Section>}
    </Screen>
  );
}
