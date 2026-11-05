export type Role = 'member' | 'exco' | 'admin';

export type NotifyPrefs = { birthdays?: boolean; events?: boolean; posts?: boolean; dues?: boolean };

export type Profile = {
  id: string;
  full_name: string;
  set_year: number;
  bd_day: number | null;
  bd_month: number | null;
  phone: string | null;
  city: string | null;
  occupation: string | null;
  role: Role;
  notify: NotifyPrefs;
  created_at: string;
};

export type SetConfig = {
  year: number;
  dues_amount: number;
  bank_code: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  paystack_subaccount: string | null;
};

export type PostKind = 'news' | 'invite' | 'announcement' | 'celebration';

export type Post = {
  id: string;
  set_year: number | null;
  kind: PostKind;
  title: string;
  body: string | null;
  event_date: string | null;
  venue: string | null;
  author_id: string;
  created_at: string;
};

export type RsvpStatus = 'going' | 'maybe' | 'no';

export type ClubEvent = {
  id: string;
  set_year: number | null;
  title: string;
  starts_on: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  venue: string | null;
  details: string | null;
  author_id: string;
  created_at: string;
  rsvps: { user_id: string; status: RsvpStatus }[];
};

export type Appeal = {
  id: string;
  set_year: number | null;
  title: string;
  details: string | null;
  target: number;
  closed: boolean;
  author_id: string;
  created_at: string;
};

export type PaymentStatus = 'initialized' | 'pending' | 'confirmed' | 'failed' | 'rejected';

export type Payment = {
  id: string;
  user_id: string | null;
  set_year: number | null;
  kind: 'dues' | 'donation';
  months: string[];
  appeal_id: string | null;
  amount: number;
  method: 'paystack' | 'transfer';
  status: PaymentStatus;
  reference: string | null;
  paid_on: string | null;
  paid_at: string | null;
  note: string | null;
  reviewed_at: string | null;
  created_at: string;
};
