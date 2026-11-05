import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Icon, type IconName } from '@/components/icons';
import { font, useTheme } from '@/lib/theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'feed', title: 'Feed', icon: 'feed' },
  { name: 'events', title: 'Events', icon: 'cal' },
  { name: 'dues', title: 'Dues', icon: 'wallet' },
  { name: 'members', title: 'Members', icon: 'people' },
];

export default function TabsLayout() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <AppHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: t.green,
          tabBarInactiveTintColor: t.muted,
          tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line },
          tabBarLabelStyle: { fontFamily: font.semi, fontSize: 11.5 },
          sceneStyle: { backgroundColor: t.bg },
        }}>
        {TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, focused }) => (
                <View style={{ alignItems: 'center' }}>
                  {focused && <View style={{ position: 'absolute', top: -8, width: 22, height: 3, borderRadius: 2, backgroundColor: t.gold }} />}
                  <Icon name={tab.icon} size={23} color={String(color)} />
                </View>
              ),
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}
