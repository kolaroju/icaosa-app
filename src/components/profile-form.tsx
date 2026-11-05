import { useState } from 'react';
import { View } from 'react-native';

import { MONTH } from '@/lib/dates';
import type { Profile } from '@/lib/types';
import { Button, ErrorText, Field, Picker, Row } from './ui';

export type ProfileInput = Pick<Profile, 'full_name' | 'set_year' | 'bd_day' | 'bd_month' | 'phone' | 'city' | 'occupation'>;

const THIS_YEAR = new Date().getFullYear();
export const SET_YEARS = Array.from({ length: THIS_YEAR - 1950 + 1 }, (_, i) => THIS_YEAR - i);

/** Shared by registration and "edit profile". */
export function ProfileForm({ initial, submitLabel, onSubmit, busy, footer }: {
  initial?: Partial<ProfileInput>; submitLabel: string; busy?: boolean; footer?: React.ReactNode;
  onSubmit: (p: ProfileInput) => Promise<void> | void;
}) {
  const [name, setName] = useState(initial?.full_name ?? '');
  const [setYear, setSetYear] = useState<number | null>(initial?.set_year ?? null);
  const [day, setDay] = useState<number | null>(initial?.bd_day ?? null);
  const [month, setMonth] = useState<number | null>(initial?.bd_month ?? null);
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [job, setJob] = useState(initial?.occupation ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const full = name.trim().replace(/\s+/g, ' ');
    if (full.length < 2) return setError('Enter your full name so classmates can find you.');
    if (!setYear) return setError('Choose your graduating set.');
    if (!!day !== !!month) return setError('Choose both the day and month of your birthday, or leave both empty.');
    setError(null);
    await onSubmit({ full_name: full, set_year: setYear, bd_day: day, bd_month: month, phone: phone.trim() || null, city: city.trim() || null, occupation: job.trim() || null });
  };

  return (
    <View style={{ gap: 16 }}>
      <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="As your classmates knew you"
        hint="Add your school-day or maiden name in brackets if it helps people find you." />
      <Picker label="Graduating set" value={setYear} onChange={setSetYear} placeholder="The year you left ICA"
        options={SET_YEARS.map((y) => ({ value: y, label: `${y} Set` }))} />
      <Row gap={10} style={{ flexWrap: 'nowrap' }}>
        <View style={{ flex: 1 }}>
          <Picker label="Birthday · day" value={day} onChange={setDay} placeholder="Day" options={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Picker label="Month" value={month} onChange={setMonth} placeholder="Month" options={MONTH.map((m, i) => ({ value: i + 1, label: m }))} />
        </View>
      </Row>
      <Field label="WhatsApp number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="0803 000 0000" />
      <Field label="City" value={city} onChangeText={setCity} placeholder="Ibadan" textContentType="addressCity" />
      <Field label="Occupation" value={job} onChangeText={setJob} placeholder="Engineer" textContentType="jobTitle" />
      <ErrorText message={error} />
      <Button title={submitLabel} onPress={submit} loading={busy} block />
      {footer}
    </View>
  );
}
