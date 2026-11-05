import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from './supabase';
import type { Appeal, ClubEvent, Payment, Post, Profile, RsvpStatus, SetConfig } from './types';

/** Calls a server function and turns its error into a readable message. */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        throw new Error(payload?.error ?? 'The server could not complete that.');
      } catch (e) {
        if (e instanceof Error && e.message) throw e;
      }
    }
    throw new Error('Could not reach ICAOSA. Check your internet connection and try again.');
  }
  return data as T;
}

/** Friendly text for any error thrown by Supabase or our functions. */
export function errorText(e: unknown): string {
  if (e instanceof Error) {
    if (/row-level security/i.test(e.message)) return "You don't have permission to do that.";
    if (/network|fetch/i.test(e.message)) return 'Could not reach ICAOSA. Check your internet connection.';
    return e.message;
  }
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Something went wrong. Please try again.';
}

function must<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

/* ---------------- Queries ---------------- */

export const keys = {
  profile: (id: string) => ['profile', id] as const,
  members: ['members'] as const,
  posts: ['posts'] as const,
  events: ['events'] as const,
  appeals: ['appeals'] as const,
  myPayments: ['payments', 'mine'] as const,
  setPayments: ['payments', 'set'] as const,
  sets: ['sets'] as const,
  summary: (month: string) => ['summary', month] as const,
};

export async function fetchProfile(id: string): Promise<Profile | null> {
  return must(await supabase.from('profiles').select('*').eq('id', id).maybeSingle()) as Profile | null;
}

export function useMembers() {
  return useQuery({
    queryKey: keys.members,
    queryFn: async () => must(await supabase.from('profiles').select('*').order('full_name')) as Profile[],
    staleTime: 60_000,
  });
}

export function usePosts() {
  return useQuery({
    queryKey: keys.posts,
    queryFn: async () => must(await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(300)) as Post[],
  });
}

export function useEvents() {
  return useQuery({
    queryKey: keys.events,
    queryFn: async () => must(await supabase.from('events').select('*, rsvps(user_id, status)').order('starts_on')) as ClubEvent[],
  });
}

export function useAppeals() {
  return useQuery({
    queryKey: keys.appeals,
    queryFn: async () => {
      const appeals = must(await supabase.from('appeals').select('*').order('created_at', { ascending: false })) as Appeal[];
      const totals = must(await supabase.rpc('appeal_totals')) as { appeal_id: string; raised: number; donors: number }[];
      const byId = new Map(totals.map((t) => [t.appeal_id, t]));
      return appeals.map((a) => ({ ...a, raised: Number(byId.get(a.id)?.raised ?? 0), donors: byId.get(a.id)?.donors ?? 0 }));
    },
  });
}

export function useMyPayments(userId: string) {
  return useQuery({
    queryKey: keys.myPayments,
    queryFn: async () =>
      must(await supabase.from('payments').select('*').eq('user_id', userId).neq('status', 'initialized').order('created_at', { ascending: false })) as Payment[],
  });
}

/** Payments an exco can see for their set (and association payments for admins). */
export function useSetPayments(enabled: boolean) {
  return useQuery({
    queryKey: keys.setPayments,
    enabled,
    queryFn: async () =>
      must(await supabase.from('payments').select('*').in('status', ['pending', 'confirmed']).order('created_at', { ascending: false }).limit(1000)) as Payment[],
  });
}

export function useSets() {
  return useQuery({
    queryKey: keys.sets,
    queryFn: async () => must(await supabase.from('sets').select('*')) as SetConfig[],
    staleTime: 60_000,
  });
}

export function useDuesSummary(month: string) {
  return useQuery({
    queryKey: keys.summary(month),
    queryFn: async () => {
      const rows = must(await supabase.rpc('set_dues_summary', { p_month: month })) as { members: number; paid: number }[];
      return rows[0] ?? { members: 0, paid: 0 };
    },
  });
}

/* ---------------- Mutations ---------------- */

/** After creating something, tell the set by push. Failures here never block the member. */
async function announce(type: 'post' | 'event' | 'appeal', id: string) {
  try {
    await callFunction('notify', { type, id });
  } catch {
    /* push is best-effort */
  }
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<Post, 'id' | 'author_id' | 'created_at'>) => {
      const row = must(await supabase.from('posts').insert(p).select('id').single()) as { id: string };
      void announce('post', row.id);
      return row;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.posts }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => must(await supabase.from('posts').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.posts }),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Pick<ClubEvent, 'set_year' | 'title' | 'starts_on' | 'start_time' | 'venue' | 'details'>) => {
      const row = must(await supabase.from('events').insert(e).select('id').single()) as { id: string };
      await supabase.from('rsvps').insert({ event_id: row.id, status: 'going' });
      void announce('event', row.id);
      return row;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.events }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => must(await supabase.from('events').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.events }),
  });
}

export function useRsvp(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: RsvpStatus | null }) => {
      if (status === null) return must(await supabase.from('rsvps').delete().eq('event_id', eventId).eq('user_id', userId));
      return must(await supabase.from('rsvps').upsert({ event_id: eventId, user_id: userId, status, updated_at: new Date().toISOString() }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.events }),
  });
}

export function useCreateAppeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Pick<Appeal, 'set_year' | 'title' | 'details' | 'target'>) => {
      const row = must(await supabase.from('appeals').insert(a).select('id').single()) as { id: string };
      void announce('appeal', row.id);
      return row;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.appeals }),
  });
}

export function useCloseAppeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => must(await supabase.from('appeals').update({ closed: true }).eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.appeals }),
  });
}

export function useRecordTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Pick<Payment, 'user_id' | 'set_year' | 'kind' | 'months' | 'appeal_id' | 'amount' | 'paid_on' | 'note' | 'reference'>) => {
      // `reference` from the member is kept in the note; the column is reserved for Paystack.
      const { reference, ...rest } = p;
      const note = [reference ? `Ref ${reference}` : '', p.note ?? ''].filter(Boolean).join(' · ') || null;
      return must(await supabase.from('payments').insert({ ...rest, note, reference: null, method: 'transfer', status: 'pending' }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myPayments });
      qc.invalidateQueries({ queryKey: keys.setPayments });
    },
  });
}

export function useReviewPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) =>
      must(await supabase.rpc('review_payment', { p_id: id, p_approve: approve })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: keys.appeals });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useSaveProfile(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Profile>) =>
      must(await supabase.from('profiles').upsert({ ...p, id: userId }).select('*').single()) as Profile,
    onSuccess: (profile) => {
      qc.setQueryData(keys.profile(userId), profile);
      qc.invalidateQueries({ queryKey: keys.members });
      qc.invalidateQueries({ queryKey: keys.posts });
      qc.invalidateQueries({ queryKey: keys.events });
    },
  });
}

export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'member' | 'exco' }) =>
      must(await supabase.from('profiles').update({ role }).eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.members }),
  });
}
