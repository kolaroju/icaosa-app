import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { fetchProfile, keys } from './api';
import { supabase } from './supabase';
import type { Profile } from './types';

type SessionState = {
  ready: boolean; // false until we know whether someone is signed in and have their profile
  session: Session | null;
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  isExco: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;
  const profileQuery = useQuery({
    queryKey: keys.profile(userId ?? 'none'),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const profile = profileQuery.data ?? null;
  const ready = authReady && (!userId || profileQuery.isFetched || profileQuery.isError);

  const value: SessionState = {
    ready,
    session,
    userId,
    email: session?.user.email ?? null,
    profile,
    isExco: profile?.role === 'exco' || profile?.role === 'admin',
    isAdmin: profile?.role === 'admin',
    signOut: async () => {
      await supabase.auth.signOut();
      qc.clear();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}

/** For screens that only render once someone is registered. */
export function useMe() {
  const s = useSession();
  if (!s.profile || !s.userId) throw new Error('This screen needs a registered member');
  return { ...s, profile: s.profile, userId: s.userId };
}
