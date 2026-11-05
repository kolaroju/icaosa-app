import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// Show notifications as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let currentToken: string | null = null;

/** Asks permission once and saves this phone's push token for the signed-in member. */
export async function registerForPush(): Promise<'granted' | 'denied' | 'unavailable'> {
  if (!Device.isDevice) return 'unavailable';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'ICAOSA updates',
      // eslint-disable-next-line import/namespace -- re-exported enum, resolved by TypeScript
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1C6A39',
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return 'denied';

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return 'unavailable';
  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    currentToken = token;
    await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS === 'ios' ? 'ios' : 'android' });
    return 'granted';
  } catch {
    return 'unavailable';
  }
}

/** Stops pushes to this phone (used on sign-out). */
export async function unregisterPush() {
  try {
    if (!currentToken && Device.isDevice && (await Notifications.getPermissionsAsync()).status === 'granted') {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (projectId) currentToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    }
    if (currentToken) await supabase.from('push_tokens').delete().eq('token', currentToken);
  } catch {
    /* signing out must never fail because of push */
  }
  currentToken = null;
}

/** Opens the right screen when a member taps a notification. */
export function useNotificationRouting(enabled: boolean, onReceive?: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const go = (data: Record<string, unknown> | undefined) => {
      const screen = typeof data?.screen === 'string' ? data.screen : null;
      if (screen && ['/', '/feed', '/events', '/dues', '/members', '/notifications'].includes(screen)) {
        router.navigate(screen as '/');
      }
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      go(last.notification.request.content.data as Record<string, unknown>);
      Notifications.clearLastNotificationResponse();
    }
    const tap = Notifications.addNotificationResponseReceivedListener((r) => go(r.notification.request.content.data as Record<string, unknown>));
    const received = Notifications.addNotificationReceivedListener(() => onReceive?.());
    return () => {
      tap.remove();
      received.remove();
    };
  }, [enabled, onReceive]);
}
