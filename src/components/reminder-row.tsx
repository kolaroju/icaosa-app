import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { errorText, useCreatePost } from '@/lib/api';
import type { Reminder } from '@/lib/reminders';
import { wishText } from '@/lib/reminders';
import { useMe } from '@/lib/session';
import { useTheme } from '@/lib/theme';
import { Icon, type IconName } from './icons';
import { Body, Button, ErrorText, LinkButton, ListItem, Small } from './ui';

const ICON: Record<Reminder['type'], IconName> = { bday: 'cake', event: 'cal', dues: 'wallet', post: 'feed', paid: 'check' };

export function ReminderRow({ r, unread, first, onNavigate }: { r: Reminder; unread: boolean; first: boolean; onNavigate?: () => void }) {
  const t = useTheme();
  const { profile } = useMe();
  const post = useCreatePost();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tone = { bday: [t.goldSoft, t.goldInk], event: [t.greenSoft, t.green], dues: [t.redSoft, t.red], post: [t.sunk, t.ink], paid: [t.greenSoft, t.green] }[r.type];

  const wish = async () => {
    if (!r.celebrant) return;
    setError(null);
    try {
      await post.mutateAsync({ set_year: profile.set_year, kind: 'celebration', ...wishText(r.celebrant, profile), event_date: null, venue: null });
      setSent(true);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <ListItem first={first}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: tone[0], alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
        <Icon name={ICON[r.type]} size={18} color={tone[1]} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Body style={{ fontWeight: '600', flexShrink: 1 }}>{r.title}</Body>
          {unread && <View accessibilityLabel="New" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.red }} />}
        </View>
        <Small>{r.sub}</Small>
        {r.celebrant && (sent
          ? <Small style={{ color: t.green }}>Your wishes are on the set feed.</Small>
          : <View style={{ paddingTop: 4 }}><Button title="Send wishes" icon="heart" variant="gold" small onPress={wish} loading={post.isPending} /></View>)}
        <ErrorText message={error} />
        {r.screen && <LinkButton label={{ '/feed': 'Open feed', '/events': 'Open events', '/dues': 'Open dues' }[r.screen]} onPress={() => { onNavigate?.(); router.navigate(r.screen!); }} />}
      </View>
    </ListItem>
  );
}
