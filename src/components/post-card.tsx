import { useState } from 'react';
import { Linking, View } from 'react-native';

import { fmtDate, setLabel, timeAgo } from '@/lib/dates';
import { font, radius, useTheme } from '@/lib/theme';
import type { Post } from '@/lib/types';
import { Icon } from './icons';
import { Action, Body, Chip, H3, Row, Small } from './ui';

const KIND = {
  news: { label: 'News', tone: 'green' },
  invite: { label: 'Invite', tone: 'gold' },
  announcement: { label: 'Announcement', tone: 'red' },
  celebration: { label: 'Celebration', tone: 'gold' },
} as const;

export function PostCard({ post, authorName, canDelete, onDelete }: { post: Post; authorName: string; canDelete: boolean; onDelete: () => void }) {
  const t = useTheme();
  const [confirm, setConfirm] = useState(false);
  const k = KIND[post.kind];
  const share = [
    post.title, post.body ?? '',
    post.event_date ? `When: ${fmtDate(post.event_date)}` : '', post.venue ? `Where: ${post.venue}` : '',
    `— ${setLabel(post.set_year)}, ICAOSA`,
  ].filter(Boolean).join('\n\n');

  return (
    <View style={{
      backgroundColor: post.kind === 'celebration' ? t.goldSoft : t.surface, borderRadius: radius, padding: 14, gap: 8,
      borderWidth: post.kind === 'celebration' ? 0 : 1, borderColor: t.line,
      borderLeftWidth: post.kind === 'announcement' ? 4 : post.kind === 'celebration' ? 0 : 1, borderLeftColor: post.kind === 'announcement' ? t.red : t.line,
    }}>
      <Row>
        <Chip label={k.label} tone={k.tone} />
        {post.set_year === null && <Chip label="Association" />}
        <Small>{authorName} · {timeAgo(post.created_at)}</Small>
      </Row>
      <H3>{post.title}</H3>
      {!!post.body && <Body selectable>{post.body}</Body>}
      {(post.event_date || post.venue) && (
        <Row gap={14}>
          {post.event_date && <Row gap={5}><Icon name="cal" size={16} color={t.ink} /><Small muted={false} style={{ fontFamily: font.semi }}>{fmtDate(post.event_date)}</Small></Row>}
          {post.venue && <Row gap={5}><Icon name="pin" size={16} color={t.ink} /><Small muted={false} style={{ fontFamily: font.semi }}>{post.venue}</Small></Row>}
        </Row>
      )}
      <Row style={{ paddingTop: 2 }}>
        <Action icon="share" label="Share on WhatsApp" onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(share)}`)} />
        {canDelete && (confirm
          ? <><Small>Delete this post?</Small><Action label="Delete" danger onPress={onDelete} /><Action label="Keep" onPress={() => setConfirm(false)} /></>
          : <Action icon="trash" danger onPress={() => setConfirm(true)} label="Delete" />)}
      </Row>
    </View>
  );
}
