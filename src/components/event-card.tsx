import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { fmtDate, fmtTime, MON, parseISODate, setLabel, weekday } from '@/lib/dates';
import { font, radius, useTheme } from '@/lib/theme';
import type { ClubEvent, RsvpStatus } from '@/lib/types';
import { Icon } from './icons';
import { Action, Body, Chip, H3, Row, Small } from './ui';

function calendarLink(e: ClubEvent) {
  const d = e.starts_on.replace(/-/g, '');
  let dates: string;
  if (e.start_time) {
    const [h, m] = e.start_time.split(':').map(Number);
    const p = (n: number) => String(n).padStart(2, '0');
    const endH = Math.min(h + 2, 23);
    dates = `${d}T${p(h)}${p(m)}00/${d}T${p(endH)}${p(m)}00`;
  } else {
    const n = parseISODate(e.starts_on);
    n.setDate(n.getDate() + 1);
    dates = `${d}/${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}`;
  }
  const details = `${e.details ?? ''}\n\n${setLabel(e.set_year)}, Ibadan City Academy Old Students Association`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${e.title} · ICAOSA`)}&dates=${dates}&ctz=Africa/Lagos&location=${encodeURIComponent(e.venue ?? '')}&details=${encodeURIComponent(details)}`;
}

export function EventCard({ event, me, authorName, past, canDelete, onRsvp, onDelete }: {
  event: ClubEvent; me: string; authorName: string; past: boolean; canDelete: boolean;
  onRsvp: (s: RsvpStatus | null) => void; onDelete: () => void;
}) {
  const t = useTheme();
  const [confirm, setConfirm] = useState(false);
  const d = parseISODate(event.starts_on);
  const mine = event.rsvps.find((r) => r.user_id === me)?.status ?? null;
  const count = (s: RsvpStatus) => event.rsvps.filter((r) => r.status === s).length;
  const invite = [
    `You're invited: ${event.title}`,
    `${fmtDate(event.starts_on)}${event.start_time ? ', ' + fmtTime(event.start_time) : ''}`,
    event.venue ? `Venue: ${event.venue}` : '', event.details ?? '', `— ${setLabel(event.set_year)}, ICAOSA`,
  ].filter(Boolean).join('\n');

  return (
    <View style={{ flexDirection: 'row', gap: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: radius, padding: 14, opacity: past ? 0.75 : 1 }}>
      <View style={{ width: 56, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: t.line, alignSelf: 'flex-start' }} accessibilityLabel={fmtDate(event.starts_on)}>
        <Text style={{ backgroundColor: t.red, color: '#fff', textAlign: 'center', fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2, paddingVertical: 3 }}>{MON[d.getMonth()].toUpperCase()}</Text>
        <Text style={{ textAlign: 'center', fontFamily: font.display, fontSize: 24, color: t.ink, paddingTop: 2 }}>{d.getDate()}</Text>
        <Text style={{ textAlign: 'center', fontFamily: font.body, fontSize: 11, color: t.muted, paddingBottom: 5 }}>{weekday(event.starts_on)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <Row>
          <Chip label={setLabel(event.set_year)} tone={event.set_year === null ? 'red' : 'green'} />
          <Small>by {authorName}</Small>
        </Row>
        <H3>{event.title}</H3>
        <Row gap={12}>
          {event.start_time && <Row gap={5}><Icon name="clock" size={15} color={t.muted} /><Small>{fmtTime(event.start_time)}</Small></Row>}
          {event.venue && <Row gap={5}><Icon name="pin" size={15} color={t.muted} /><Small>{event.venue}</Small></Row>}
        </Row>
        {!!event.details && <Body style={{ fontSize: 14 }} selectable>{event.details}</Body>}
        <Small>{count('going')} going · {count('maybe')} maybe · {count('no')} can’t make it</Small>
        <Row>
          {!past && (['going', 'maybe', 'no'] as const).map((s) => (
            <Action key={s} label={{ going: 'Going', maybe: 'Maybe', no: "Can't go" }[s]} active={mine === s} onPress={() => onRsvp(mine === s ? null : s)} />
          ))}
          {!past && <Action icon="cal" label="Add to calendar" onPress={() => Linking.openURL(calendarLink(event))} />}
          <Action icon="share" label="Invite" onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(invite)}`)} />
          {canDelete && (confirm
            ? <><Action label="Delete event" danger onPress={onDelete} /><Action label="Keep" onPress={() => setConfirm(false)} /></>
            : <Action icon="trash" label="Delete" danger onPress={() => setConfirm(true)} />)}
        </Row>
      </View>
    </View>
  );
}
