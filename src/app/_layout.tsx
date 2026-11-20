import {
  BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold, useFonts,
} from '@expo-google-fonts/instrument-sans';
import { focusManager, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { AppState, Platform, View } from 'react-native';

import { Body, H1, Notice } from '@/components/ui';
import { registerForPush, useNotificationRouting } from '@/lib/push';
import { SessionProvider, useSession } from '@/lib/session';
import { isConfigured } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { useWebAppHead, useWebPaymentReturn } from '@/lib/web';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 15_000 } },
});

// Refetch data whenever the app comes back to the foreground.
AppState.addEventListener('change', (s) => {
  if (Platform.OS !== 'web') focusManager.setFocused(s === 'active');
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Navigator />
      </SessionProvider>
    </QueryClientProvider>
  );
}

function Navigator() {
  const t = useTheme();
  const qc = useQueryClient();
  const { ready, session, profile } = useSession();
  const signedIn = !!session;
  const registered = signedIn && !!profile;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Once a member is registered, ask for notification permission and save the device.
  useEffect(() => {
    if (registered) void registerForPush();
  }, [registered]);

  const refresh = useCallback(() => qc.invalidateQueries(), [qc]);
  useNotificationRouting(registered, refresh);
  useWebAppHead();
  useWebPaymentReturn(ready && registered);

  if (!isConfigured) return <SetupNeeded />;
  if (!ready) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !profile}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={registered}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
          <Stack.Screen name="new-event" options={{ presentation: 'modal' }} />
          <Stack.Screen name="pay" options={{ presentation: 'modal' }} />
          <Stack.Screen name="record-transfer" options={{ presentation: 'modal' }} />
          <Stack.Screen name="set-account" options={{ presentation: 'modal' }} />
          <Stack.Screen name="new-appeal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
          <Stack.Screen name="payment-complete" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

function SetupNeeded() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, justifyContent: 'center', gap: 14 }}>
      <H1>ICAOSA isn’t connected yet</H1>
      <Body>This build is missing its Supabase address and key.</Body>
      <Notice>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to eas.json (or .env.local), then build again. See step 3 of docs/LAUNCH-GUIDE.md.</Notice>
    </View>
  );
}
