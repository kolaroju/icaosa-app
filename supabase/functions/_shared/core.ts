// Shared helpers for ICAOSA server functions (Supabase Edge Functions, Deno).
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Wraps a handler with CORS, JSON errors and logging. */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Something went wrong on the server. Please try again.' }, 500);
    }
  });
}

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}. Set it with: supabase secrets set ${name}=...`);
  return v;
}

/** The project's server key. Supports both the new secret keys and the legacy service_role key. */
function serverKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>;
      const k = parsed.default ?? Object.values(parsed)[0];
      if (k) return k;
    } catch { /* fall through */ }
  }
  return env('SUPABASE_SERVICE_ROLE_KEY');
}

let _admin: SupabaseClient | null = null;
/** Client that bypasses Row Level Security. Only use after checking who is calling. */
export function admin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(env('SUPABASE_URL'), serverKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

/** Verifies the caller's sign-in token and returns the user. */
export async function requireUser(req: Request): Promise<User> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Please sign in again.');
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  return data.user;
}

export type Profile = {
  id: string;
  full_name: string;
  set_year: number;
  role: 'member' | 'exco' | 'admin';
  notify: Record<string, boolean> | null;
  bd_day: number | null;
  bd_month: number | null;
};

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await admin().from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(403, 'Finish registering into your set first.');
  return data as Profile;
}

export function isExcoOf(p: Profile, setYear: number | null): boolean {
  return p.role === 'admin' || (p.role === 'exco' && setYear !== null && p.set_year === setYear);
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'The request was not valid JSON.');
  }
}

export const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const setLabel = (y: number | null) => (y === null ? 'ICAOSA' : `${y} Set`);

/** Today's date in Lagos as {y, m, d}. */
export function lagosToday(offsetDays = 0): { y: number; m: number; d: number; iso: string } {
  const now = new Date(Date.now() + offsetDays * 864e5);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [y, m, d] = parts.split('-').map(Number);
  return { y, m, d, iso: parts };
}
