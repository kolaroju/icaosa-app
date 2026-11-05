import { router } from 'expo-router';
import { Fragment, useState } from 'react';

import { EventCard } from '@/components/event-card';
import { Button, EmptyState, H1, Row, Screen, Segmented, Small } from '@/components/ui';
import { useDeleteEvent, useEvents, useMembers, useRsvp } from '@/lib/api';
import { MONTH, parseISODate, todayISO } from '@/lib/dates';
import { useMe } from '@/lib/session';
import { font } from '@/lib/theme';

export default function Events() {
  const { profile, userId, isExco } = useMe();
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const events = useEvents();
  const members = useMembers();
  const rsvp = useRsvp(userId);
  const del = useDeleteEvent();
  const names = new Map((members.data ?? []).map((m) => [m.id, m.full_name]));
  const today = todayISO();
  const up = when === 'upcoming';
  const list = (events.data ?? [])
    .filter((e) => (up ? e.starts_on >= today : e.starts_on < today))
    .sort((a, b) => (up ? 1 : -1) * (a.starts_on + (a.start_time ?? '')).localeCompare(b.starts_on + (b.start_time ?? '')));

  let lastMonth = '';
  return (
    <Screen onRefresh={() => events.refetch()} refreshing={events.isRefetching}>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Events</H1>
        <Button title="Event" icon="plus" small onPress={() => router.push('/new-event')} />
      </Row>
      <Segmented value={when} onChange={setWhen} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} />
      {list.length ? list.map((e) => {
        const d = parseISODate(e.starts_on);
        const m = `${MONTH[d.getMonth()]} ${d.getFullYear()}`;
        const header = m !== lastMonth ? m : null;
        lastMonth = m;
        return (
          <Fragment key={e.id}>
            {header && <Small style={{ fontFamily: font.display, fontSize: 15, marginBottom: -12 }}>{header}</Small>}
            <EventCard event={e} me={userId} past={!up} authorName={names.get(e.author_id) ?? 'A member'}
              canDelete={e.author_id === userId || (isExco && (e.set_year === profile.set_year || profile.role === 'admin'))}
              onRsvp={(s) => rsvp.mutate({ eventId: e.id, status: s })} onDelete={() => del.mutate(e.id)} />
          </Fragment>
        );
      }) : (
        <EmptyState
          title={up ? 'No upcoming events' : 'No past events yet'}
          body={up ? "Add your set's next meeting, reunion, or a member's wedding or burial date so everyone can plan." : 'Events move here once their date has passed.'}
          action={up ? <Button title="Add an event" icon="plus" small onPress={() => router.push('/new-event')} /> : undefined} />
      )}
    </Screen>
  );
}
