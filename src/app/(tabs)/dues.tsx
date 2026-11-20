import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import {
  Action, Avatar, Body, Button, Card, Chip, EmptyState, ErrorText, Eyebrow, H1, H2, H3, LinkButton, List, ListItem, Row, Screen, Section, Small,
} from '@/components/ui';
import { errorText, useAppeals, useCloseAppeal, useMembers, useMyPayments, useReviewPayment, useSetPayments, useSets } from '@/lib/api';
import { MON, MONTH, monthKey, monthLabel, naira, setLabel, thisMonthKey } from '@/lib/dates';
import { useMe } from '@/lib/session';
import { font, radius, useTheme } from '@/lib/theme';
import type { Payment } from '@/lib/types';

const THIS_YEAR = new Date().getFullYear();

function duesState(payments: Payment[], uid: string, key: string): 'paid' | 'pending' | null {
  let s: 'paid' | 'pending' | null = null;
  for (const p of payments) {
    if (p.user_id !== uid || p.kind !== 'dues' || !p.months.includes(key)) continue;
    if (p.status === 'confirmed') return 'paid';
    if (p.status === 'pending') s = 'pending';
  }
  return s;
}

const describe = (p: Payment, appeals: { id: string; title: string }[]) =>
  p.kind === 'dues'
    ? `Dues · ${p.months.map(monthLabel).join(', ')}`
    : `Donation · ${appeals.find((a) => a.id === p.appeal_id)?.title ?? `${setLabel(p.set_year)} fund`}`;

export default function Dues() {
  const t = useTheme();
  const { profile, userId, isExco, isAdmin } = useMe();
  const y = profile.set_year;
  const sets = useSets();
  const mine = useMyPayments(userId);
  const appeals = useAppeals();
  const [year, setYear] = useState(THIS_YEAR);
  const [copied, setCopied] = useState(false);

  const cfg = sets.data?.find((s) => s.year === y);
  const dues = cfg?.dues_amount ?? 0;
  const connected = !!cfg?.paystack_subaccount;
  const payments = mine.data ?? [];
  const now = new Date();
  const curIdx = now.getFullYear() * 12 + now.getMonth();
  const joined = new Date(profile.created_at);
  const joinIdx = joined.getFullYear() * 12 + joined.getMonth();
  const openAppeals = (appeals.data ?? []).filter((a) => !a.closed);

  const cells = MON.map((m, i) => {
    const key = monthKey(year, i);
    const st = duesState(payments, userId, key);
    const idx = year * 12 + i;
    const state: 'paid' | 'pending' | 'due' | 'later' | 'none' = st ?? (idx > curIdx ? 'later' : dues > 0 && idx >= joinIdx ? 'due' : 'none');
    return { m, key, state };
  });

  const copy = async () => {
    if (!cfg?.account_number) return;
    await Clipboard.setStringAsync(cfg.account_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen onRefresh={() => { sets.refetch(); mine.refetch(); appeals.refetch(); }} refreshing={mine.isRefetching}>
      <H1>Dues & donations</H1>

      {connected ? (
        <Card tone="gold" style={{ gap: 10, padding: 16 }}>
          <Eyebrow color={t.goldInk}>{setLabel(y)} monthly dues</Eyebrow>
          <Text style={{ fontFamily: font.display, fontSize: 32, color: t.ink, fontVariant: ['tabular-nums'] }}>{dues ? naira(dues) : 'Not set yet'}</Text>
          <Body style={{ fontSize: 14 }}>Payments go straight to the set’s {cfg?.bank_name ?? ''} account, {cfg?.account_name}.</Body>
          <Row>
            <Text selectable style={{ fontFamily: font.display, fontSize: 19, letterSpacing: 1.5, color: t.ink, fontVariant: ['tabular-nums'] }}>{cfg?.account_number}</Text>
            <Action icon={copied ? 'check' : 'copy'} label={copied ? 'Copied' : 'Copy'} onPress={copy} />
          </Row>
        </Card>
      ) : (
        <EmptyState
          title="Your set account isn't connected yet"
          body={isExco ? "Add the set's bank account and monthly dues so members can pay with Paystack." : "Your set's treasurer or exco will connect the set's bank account here."}
          action={isExco ? <Button title="Connect set account" icon="bank" small onPress={() => router.push('/set-account')} /> : undefined} />
      )}

      <Section title="My dues" action={
        <Row gap={6}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous year" onPress={() => setYear(year - 1)} hitSlop={6} style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}><Icon name="left" size={16} color={t.ink} /></Pressable>
          <Text style={{ fontFamily: font.display, fontSize: 16, color: t.ink, minWidth: 46, textAlign: 'center' }}>{year}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next year" disabled={year >= THIS_YEAR + 1} onPress={() => setYear(year + 1)} hitSlop={6} style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center', opacity: year >= THIS_YEAR + 1 ? 0.4 : 1 }}><Icon name="right" size={16} color={t.ink} /></Pressable>
        </Row>
      }>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {cells.map((c) => {
            const look = {
              paid: { bg: t.green, border: t.green, fg: t.onGreen, label: 'Paid' },
              pending: { bg: t.goldSoft, border: t.gold, fg: t.goldInk, label: 'Pending' },
              due: { bg: t.surface, border: t.red, fg: t.red, label: 'Due' },
              later: { bg: t.sunk, border: t.sunk, fg: t.muted, label: 'Later' },
              none: { bg: t.sunk, border: t.sunk, fg: t.muted, label: '—' },
            }[c.state];
            return (
              <View key={c.key} accessibilityLabel={`${MONTH[Number(c.key.slice(5)) - 1]}: ${look.label}`}
                style={{ width: '15.2%', flexGrow: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', gap: 2, backgroundColor: look.bg, borderWidth: 1.5, borderColor: look.border, borderStyle: c.state === 'pending' ? 'dashed' : 'solid' }}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: look.fg }}>{c.m}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 10.5, color: look.fg }}>{look.label}</Text>
              </View>
            );
          })}
        </View>
        <Row gap={10}>
          <Button title="Pay dues" icon="card" disabled={!connected || !dues} onPress={() => router.push({ pathname: '/pay', params: { kind: 'dues' } })} />
          <Button title="Donate" icon="gift" variant="gold" disabled={!connected} onPress={() => router.push({ pathname: '/pay', params: { kind: 'donation' } })} />
        </Row>
        <LinkButton label="Paid by bank transfer? Record it for your treasurer" onPress={() => router.push('/record-transfer')} />
      </Section>

      {isExco && <TreasurerDesk />}

      <Section title="Appeals">
        {openAppeals.length ? openAppeals.map((a) => <AppealCard key={a.id} appeal={a} canClose={isAdmin || (isExco && a.set_year === y)} />) : (
          <EmptyState title="No open appeals" body="Fundraising for a classmate in need, a school project or a reunion will show here with its progress." />
        )}
      </Section>

      <Section title="My payment history">
        {payments.length ? (
          <List>
            {payments.map((p, i) => (
              <ListItem key={p.id} first={i === 0}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body style={{ fontWeight: '600' }}>{describe(p, appeals.data ?? [])}</Body>
                  <Small>{p.method === 'paystack' ? 'Paystack' : 'Bank transfer'} · {new Date(p.paid_at ?? p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</Small>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontFamily: font.bold, color: t.ink, fontVariant: ['tabular-nums'] }}>{naira(p.amount)}</Text>
                  <Chip label={{ confirmed: 'Received', pending: 'Awaiting check', failed: 'Failed', rejected: 'Not received', initialized: 'Started' }[p.status]}
                    tone={p.status === 'confirmed' ? 'green' : p.status === 'pending' ? 'gold' : 'red'} />
                </View>
              </ListItem>
            ))}
          </List>
        ) : <EmptyState title="No payments yet" body="Your dues and donations will be listed here with their status." />}
      </Section>
    </Screen>
  );
}

function AppealCard({ appeal, canClose }: { appeal: ReturnType<typeof useAppeals>['data'] extends (infer A)[] | undefined ? A : never; canClose: boolean }) {
  const t = useTheme();
  const close = useCloseAppeal();
  const pct = appeal.target ? Math.min(100, Math.round((appeal.raised / appeal.target) * 100)) : 0;
  return (
    <Card>
      <Row><Chip label={setLabel(appeal.set_year)} tone={appeal.set_year === null ? 'red' : 'green'} /><Small>{appeal.donors} donor{appeal.donors === 1 ? '' : 's'}</Small></Row>
      <H3>{appeal.title}</H3>
      {!!appeal.details && <Body style={{ fontSize: 14 }}>{appeal.details}</Body>}
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }} style={{ height: 10, borderRadius: 6, backgroundColor: t.sunk, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: t.green, borderRadius: 6 }} />
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Small muted={false}><Text style={{ fontFamily: font.bold }}>{naira(appeal.raised)}</Text> of {naira(appeal.target)} · {pct}%</Small>
        <Button title="Give" variant="gold" small onPress={() => router.push({ pathname: '/pay', params: { kind: 'donation', appeal: appeal.id } })} />
      </Row>
      {canClose && <LinkButton label="Close this appeal" onPress={() => close.mutate(appeal.id)} />}
    </Card>
  );
}

/** Admins only: the association's own account for association-wide appeals (stored as year 0). */
function NationalAccount() {
  const sets = useSets();
  const nat = sets.data?.find((s) => s.year === 0);
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>ICAOSA national account</Eyebrow>
      <Small>{nat?.paystack_subaccount
        ? `${nat.bank_name ?? 'Bank'} · ${nat.account_name ?? ''} · ${nat.account_number ?? ''}. Association-wide appeals are paid here.`
        : 'Not connected. Association-wide appeals can’t take payments until it is.'}</Small>
      <Button title={nat?.paystack_subaccount ? 'Change national account' : 'Connect national account'} icon="bank" variant="ghost" small
        onPress={() => router.push({ pathname: '/set-account', params: { scope: 'association' } })} />
    </View>
  );
}

function TreasurerDesk() {
  const t = useTheme();
  const { profile, isAdmin } = useMe();
  const y = profile.set_year;
  const all = useSetPayments(true);
  const members = useMembers();
  const appeals = useAppeals();
  const review = useReviewPayment();
  const [showRoll, setShowRoll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mine = (all.data ?? []).filter((p) => p.set_year === y || (isAdmin && p.set_year === null));
  const pending = mine.filter((p) => p.status === 'pending' && p.method === 'transfer');
  const confirmed = mine.filter((p) => p.status === 'confirmed');
  const yearTotal = confirmed.filter((p) => new Date(p.paid_at ?? p.created_at).getFullYear() === THIS_YEAR && p.set_year === y).reduce((s, p) => s + p.amount, 0);
  const setMembers = (members.data ?? []).filter((m) => m.set_year === y);
  const names = new Map((members.data ?? []).map((m) => [m.id, m.full_name]));
  const cur = thisMonthKey();
  const paidNow = setMembers.filter((m) => duesState(mine, m.id, cur) === 'paid').length;

  const act = async (id: string, approve: boolean) => {
    setError(null);
    try { await review.mutateAsync({ id, approve }); } catch (e) { setError(errorText(e)); }
  };

  return (
    <View style={{ borderWidth: 2, borderColor: t.green, backgroundColor: t.greenSoft, borderRadius: radius + 2, padding: 14, gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <H2>Treasurer’s desk</H2>
        <Button title="Account & dues" variant="ghost" small onPress={() => router.push('/set-account')} />
      </Row>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[[naira(yearTotal), `received in ${THIS_YEAR}`], [`${paidNow}/${setMembers.length}`, `paid ${MON[new Date().getMonth()]}`], [String(pending.length), 'to check']].map(([v, l]) => (
          <View key={l} style={{ flex: 1, backgroundColor: t.surface, borderRadius: 12, padding: 10 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font.display, fontSize: 18, color: t.ink }}>{v}</Text>
            <Small>{l}</Small>
          </View>
        ))}
      </View>

      <Eyebrow>Bank transfers to check</Eyebrow>
      {pending.length ? (
        <List>
          {pending.map((p, i) => (
            <ListItem key={p.id} first={i === 0}>
              <Avatar id={p.user_id ?? p.id} name={names.get(p.user_id ?? '') ?? '?'} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <Body style={{ fontWeight: '600' }}>{names.get(p.user_id ?? '') ?? 'Former member'} · {naira(p.amount)}</Body>
                <Small>{describe(p, appeals.data ?? [])}{p.paid_on ? ` · paid ${p.paid_on}` : ''}{p.note ? ` · ${p.note}` : ''}</Small>
                <Row style={{ paddingTop: 4 }}>
                  <Action icon="check" label="Received" active onPress={() => act(p.id, true)} />
                  <Action icon="x" label="Not received" danger onPress={() => act(p.id, false)} />
                </Row>
              </View>
            </ListItem>
          ))}
        </List>
      ) : <Small>Nothing to check. Paystack payments confirm themselves; transfers members record will wait here for you.</Small>}
      <ErrorText message={error} />

      {confirmed.length > 0 && (
        <>
          <Eyebrow>Latest received</Eyebrow>
          <List>
            {confirmed.slice(0, 8).map((p, i) => (
              <ListItem key={p.id} first={i === 0}>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: '600' }}>{names.get(p.user_id ?? '') ?? 'Former member'}</Body>
                  <Small>{describe(p, appeals.data ?? [])} · {p.method === 'paystack' ? 'Paystack' : 'Transfer'}</Small>
                </View>
                <Text style={{ fontFamily: font.bold, color: t.ink, fontVariant: ['tabular-nums'] }}>{naira(p.amount)}</Text>
              </ListItem>
            ))}
          </List>
        </>
      )}

      <LinkButton label={showRoll ? `Hide ${MONTH[new Date().getMonth()]} list` : `Who has paid for ${MONTH[new Date().getMonth()]}`} onPress={() => setShowRoll(!showRoll)} />
      {showRoll && (
        <List>
          {setMembers.map((m, i) => {
            const st = duesState(mine, m.id, cur);
            return (
              <ListItem key={m.id} first={i === 0}>
                <Body style={{ flex: 1 }}>{m.full_name}</Body>
                <Chip label={st === 'paid' ? 'Paid' : st === 'pending' ? 'Pending' : 'Not yet'} tone={st === 'paid' ? 'green' : st === 'pending' ? 'gold' : 'red'} />
              </ListItem>
            );
          })}
        </List>
      )}
      <Button title="Start a donation appeal" icon="gift" variant="ghost" small onPress={() => router.push('/new-appeal')} />
      {isAdmin && <NationalAccount />}
    </View>
  );
}
