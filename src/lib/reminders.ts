// Builds the in-app notification list: birthdays this week, events in the
// next two weeks, unpaid dues for this month, payment results and new posts.
import { dayDiff, daysToBirthday, firstName, fmtDate, fmtTime, MONTH, naira, parseISODate, setLabel, thisMonthKey } from './dates';
import type { ClubEvent, Payment, Post, Profile, SetConfig } from './types';

export type Reminder = {
  key: string;
  type: 'bday' | 'event' | 'dues' | 'post' | 'paid';
  title: string;
  sub: string;
  rank: number;
  screen?: '/feed' | '/events' | '/dues';
  celebrant?: Profile;
};

export function buildReminders(args: {
  me: Profile;
  members: Profile[];
  events: ClubEvent[];
  posts: Post[];
  payments: Payment[];
  sets: SetConfig[];
  postsSeenAt: number;
}): Reminder[] {
  const { me, members, events, posts, payments, sets, postsSeenAt } = args;
  const out: Reminder[] = [];
  const now = new Date();
  const year = now.getFullYear();

  for (const p of members.filter((m) => m.set_year === me.set_year)) {
    const d = daysToBirthday(p.bd_day, p.bd_month);
    if (d === null || d > 7) continue;
    const self = p.id === me.id;
    const date = `${p.bd_day} ${MONTH[(p.bd_month ?? 1) - 1]}`;
    out.push({
      key: `bd-${p.id}-${year}-${d === 0 ? 'day' : 'wk'}`,
      type: 'bday',
      rank: d,
      title: self
        ? d === 0 ? 'Happy birthday from ICAOSA!' : `Your birthday is in ${d} day${d > 1 ? 's' : ''}`
        : d === 0 ? `It's ${p.full_name}'s birthday today` : d === 1 ? `${p.full_name}'s birthday is tomorrow` : `${p.full_name}'s birthday is in ${d} days`,
      sub: self ? date : `${date} · ${setLabel(p.set_year)}`,
      celebrant: d === 0 && !self ? p : undefined,
    });
  }

  for (const e of events) {
    const d = dayDiff(parseISODate(e.starts_on), now);
    if (d < 0 || d > 14) continue;
    out.push({
      key: `ev-${e.id}-${d <= 1 ? 'soon' : 'wk'}`,
      type: 'event',
      rank: d,
      title: d === 0 ? `Today: ${e.title}` : d === 1 ? `Tomorrow: ${e.title}` : `${e.title} in ${d} days`,
      sub: [fmtDate(e.starts_on), fmtTime(e.start_time), e.venue].filter(Boolean).join(' · '),
      screen: '/events',
    });
  }

  const dues = sets.find((s) => s.year === me.set_year)?.dues_amount ?? 0;
  const month = thisMonthKey();
  const paid = payments.some((p) => p.kind === 'dues' && p.user_id === me.id && ['pending', 'confirmed'].includes(p.status) && p.months.includes(month));
  if (dues > 0 && !paid) {
    out.push({
      key: `dues-${month}-${now.getDate() > 20 ? 'late' : 'open'}`,
      type: 'dues',
      rank: 3,
      title: `${MONTH[now.getMonth()]} dues of ${naira(dues)} are due`,
      sub: 'Pay with Paystack in a few taps',
      screen: '/dues',
    });
  }

  for (const p of payments) {
    if (p.user_id !== me.id || !p.paid_at) continue;
    if (Date.now() - new Date(p.paid_at).getTime() > 14 * 864e5) continue;
    if (p.status !== 'confirmed') continue;
    out.push({
      key: `paid-${p.id}`,
      type: 'paid',
      rank: 4,
      title: `Your ${naira(p.amount)} payment was received`,
      sub: p.kind === 'dues' ? 'Thank you for keeping your dues up to date' : 'Thank you for your donation',
      screen: '/dues',
    });
  }

  const fresh = posts.filter((p) => p.author_id !== me.id && new Date(p.created_at).getTime() > postsSeenAt);
  if (fresh.length) {
    out.push({
      key: `posts-${fresh[0].id}`,
      type: 'post',
      rank: 5,
      title: `${fresh.length} new post${fresh.length > 1 ? 's' : ''} since your last visit`,
      sub: fresh.slice(0, 2).map((p) => p.title).join(' · '),
      screen: '/feed',
    });
  }

  return out.sort((a, b) => a.rank - b.rank);
}

/* Small persistent store for what the member has already seen. */
const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch { /* ignore */ }
};

export const seenStore = {
  keys: (uid: string) => new Set(read<string[]>(`icaosa.seen.${uid}`, [])),
  markSeen: (uid: string, ks: string[]) => {
    const all = [...new Set([...read<string[]>(`icaosa.seen.${uid}`, []), ...ks])].slice(-300);
    write(`icaosa.seen.${uid}`, all);
  },
  postsSeenAt: (uid: string) => read<number>(`icaosa.postsSeen.${uid}`, 0),
  markPostsSeen: (uid: string) => write(`icaosa.postsSeen.${uid}`, Date.now()),
};

export const wishText = (celebrant: Profile, me: Profile) => ({
  title: `Happy birthday, ${celebrant.full_name}!`,
  body: `Warm wishes from ${firstName(me.full_name)} and the whole ${setLabel(me.set_year)}. Many happy returns.`,
});
