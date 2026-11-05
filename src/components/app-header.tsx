import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/lib/session';
import { font, useTheme } from '@/lib/theme';
import { useReminders } from '@/lib/use-reminders';
import { Avatar, Crest, CrestStripe, IconButton } from './ui';

export function AppHeader() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, userId } = useSession();
  const { unread } = useReminders();
  return (
    <View style={{ backgroundColor: t.surface, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Crest size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: font.display, fontSize: 20, letterSpacing: 1.2, color: t.ink, lineHeight: 22 }}>ICAOSA</Text>
          <Text numberOfLines={1} style={{ fontFamily: font.body, fontSize: 12, color: t.muted }}>Ibadan City Academy Old Students</Text>
        </View>
        <IconButton icon="bell" label="Notifications" badge={unread} onPress={() => router.push('/notifications')} />
        {profile && userId && (
          <Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={() => router.push('/profile')} hitSlop={6}>
            <Avatar id={userId} name={profile.full_name} size={42} />
          </Pressable>
        )}
      </View>
      <CrestStripe />
    </View>
  );
}
