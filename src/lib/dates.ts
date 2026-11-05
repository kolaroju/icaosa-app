export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISODate(new Date());
export const monthKey = (y: number, m0: number) => `${y}-${pad(m0 + 1)}`;
export const thisMonthKey = () => monthKey(new Date().getFullYear(), new Date().getMonth());

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from `b` to `a`, ignoring time of day. */
export function dayDiff(a: Date, b: Date): number {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((A - B) / 864e5);
}

export const fmtDate = (s: string) => {
  const d = parseISODate(s);
  return `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtShort = (s: string) => {
  const d = parseISODate(s);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};
export const weekday = (s: string) => DAY[parseISODate(s).getDay()];

export function fmtTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)}${h >= 12 ? 'pm' : 'am'}`;
}

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

/** Days until the next birthday (0 = today), or null if unknown. */
export function daysToBirthday(day: number | null, month: number | null): number | null {
  if (!day || !month) return null;
  const now = new Date();
  let next = new Date(now.getFullYear(), month - 1, day);
  if (dayDiff(next, now) < 0) next = new Date(now.getFullYear() + 1, month - 1, day);
  return dayDiff(next, now);
}

export const monthLabel = (key: string) => `${MON[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`;

export const naira = (n: number) => '₦' + Math.round(n || 0).toLocaleString('en-NG');

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export const setLabel = (y: number | null) => (y === null ? 'Association' : `${y} Set`);

/** Nigerian numbers to WhatsApp format: 0803… → 234803… */
export function whatsappNumber(phone: string | null): string {
  let d = (phone ?? '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = '234' + d.slice(1);
  else if (d.length === 10) d = '234' + d;
  return d;
}
