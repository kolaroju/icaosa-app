// Sends push notifications through Expo's push service (which delivers to
// Firebase Cloud Messaging on Android and APNs on iPhone).
import { admin } from './core.ts';

export type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, unknown>; // e.g. { screen: '/feed' }
};

type Category = 'birthdays' | 'events' | 'posts' | 'dues';

/**
 * Notify members. `audience` picks people by set (null = whole association)
 * or by explicit ids. People who switched a category off are skipped.
 */
export async function notify(
  audience: { setYear?: number | null; userIds?: string[]; exclude?: string[] },
  category: Category,
  message: PushMessage,
): Promise<number> {
  let q = admin().from('profiles').select('id, notify');
  if (audience.userIds) q = q.in('id', audience.userIds.length ? audience.userIds : ['00000000-0000-0000-0000-000000000000']);
  else if (audience.setYear !== null && audience.setYear !== undefined) q = q.eq('set_year', audience.setYear);
  const { data: people, error } = await q;
  if (error) throw error;
  const exclude = new Set(audience.exclude ?? []);
  const ids = (people ?? [])
    .filter((p) => !exclude.has(p.id) && (p.notify?.[category] ?? true) !== false)
    .map((p) => p.id as string);
  if (!ids.length) return 0;
  return sendToUsers(ids, message);
}

export async function sendToUsers(userIds: string[], message: PushMessage): Promise<number> {
  const tokens: string[] = [];
  for (let i = 0; i < userIds.length; i += 300) {
    const { data, error } = await admin().from('push_tokens').select('token').in('user_id', userIds.slice(i, i + 300));
    if (error) throw error;
    tokens.push(...(data ?? []).map((t) => t.token as string));
  }
  return sendToTokens(tokens, message);
}

export async function sendToTokens(tokens: string[], message: PushMessage): Promise<number> {
  const valid = [...new Set(tokens)].filter((t) => /^Expo(nent)?PushToken\[.+\]$/.test(t));
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN'); // optional, for Expo's "enhanced push security"
  let sent = 0;
  const dead: string[] = [];
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(chunk.map((to) => ({
        to,
        title: message.title,
        body: message.body,
        data: message.data ?? {},
        sound: 'default',
        channelId: 'default',
      }))),
    });
    if (!res.ok) {
      console.error('Expo push failed', res.status, await res.text());
      continue;
    }
    const out = await res.json() as { data?: Array<{ status: string; details?: { error?: string } }> };
    (out.data ?? []).forEach((ticket, j) => {
      if (ticket.status === 'ok') sent++;
      else if (ticket.details?.error === 'DeviceNotRegistered') dead.push(chunk[j]);
    });
  }
  if (dead.length) await admin().from('push_tokens').delete().in('token', dead);
  return sent;
}
