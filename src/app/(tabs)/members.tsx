import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Action, Avatar, Chip, EmptyState, ErrorText, H1, List, ListItem, Picker, Row, Screen, Section, Small, Body } from '@/components/ui';
import { errorText, useMembers, useSetRole } from '@/lib/api';
import { MON, MONTH, setLabel, whatsappNumber } from '@/lib/dates';
import { useMe } from '@/lib/session';
import { font, radius, useTheme } from '@/lib/theme';

export default function Members() {
  const t = useTheme();
  const { profile, userId, isAdmin } = useMe();
  const members = useMembers();
  const setRole = useSetRole();
  const [year, setYear] = useState<number>(profile.set_year);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const all = useMemo(() => members.data ?? [], [members.data]);
  const counts = useMemo(() => {
    const c = new Map<number, number>();
    for (const m of all) c.set(m.set_year, (c.get(m.set_year) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[0] - a[0]);
  }, [all]);

  const inSet = all.filter((m) => m.set_year === year);
  const needle = q.trim().toLowerCase();
  const shown = needle ? inSet.filter((m) => [m.full_name, m.city, m.occupation].join(' ').toLowerCase().includes(needle)) : inSet;
  const nowM = new Date().getMonth() + 1;
  const bdays = inSet.filter((m) => m.bd_month === nowM).sort((a, b) => (a.bd_day ?? 0) - (b.bd_day ?? 0));

  const toggleExco = async (id: string, isExco: boolean) => {
    setError(null);
    try { await setRole.mutateAsync({ id, role: isExco ? 'member' : 'exco' }); } catch (e) { setError(errorText(e)); }
  };

  return (
    <Screen onRefresh={() => members.refetch()} refreshing={members.isRefetching}>
      <H1>Members</H1>
      <Picker label="Set" value={year} onChange={setYear}
        options={(counts.some(([y]) => y === profile.set_year) ? counts : [[profile.set_year, 0] as [number, number], ...counts]).map(([y, n]) => ({ value: y, label: `${y} Set (${n})` }))} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 12, paddingHorizontal: 12 }}>
        <Icon name="search" size={18} color={t.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search by name, city or work" placeholderTextColor={t.muted} accessibilityLabel="Search members"
          style={{ flex: 1, minHeight: 46, fontFamily: font.body, fontSize: 16, color: t.ink }} />
      </View>

      {bdays.length > 0 && (
        <Section title={`${MONTH[nowM - 1]} birthdays`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {bdays.map((m) => (
              <View key={m.id} style={{ width: 78, alignItems: 'center', gap: 5 }}>
                <Avatar id={m.id} name={m.full_name} size={54} ring />
                <Text numberOfLines={1} style={{ fontFamily: font.semi, fontSize: 13, color: t.ink }}>{m.full_name.split(/\s+/)[0]}</Text>
                <Small>{m.bd_day} {MON[nowM - 1]}</Small>
              </View>
            ))}
          </ScrollView>
        </Section>
      )}

      <Section title={setLabel(year)} action={<Small>{shown.length} member{shown.length === 1 ? '' : 's'}</Small>}>
        <ErrorText message={error} />
        {shown.length ? (
          <List>
            {shown.map((m, i) => {
              const wa = whatsappNumber(m.phone);
              const exco = m.role === 'exco';
              return (
                <ListItem key={m.id} first={i === 0}>
                  <Avatar id={m.id} name={m.full_name} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Row gap={6}>
                      <Body style={{ fontWeight: '600', flexShrink: 1 }}>{m.full_name}</Body>
                      {m.id === userId && <Chip label="You" />}
                      {m.role !== 'member' && <Chip label={m.role === 'admin' ? 'Admin' : 'Exco'} tone="gold" />}
                    </Row>
                    <Small>{[m.occupation, m.city].filter(Boolean).join(' · ') || 'Old student'}{m.bd_month ? ` · Birthday ${m.bd_day} ${MON[m.bd_month - 1]}` : ''}</Small>
                    {!!m.phone && <Text selectable style={{ fontFamily: font.body, fontSize: 13, color: t.muted }}>{m.phone}</Text>}
                  </View>
                  <View style={{ gap: 6, alignItems: 'flex-end' }}>
                    {wa && m.id !== userId && <Action icon="chat" label="WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${wa}`)} />}
                    {isAdmin && m.role !== 'admin' && <Action label={exco ? 'Remove exco' : 'Make exco'} active={exco} onPress={() => toggleExco(m.id, exco)} />}
                  </View>
                </ListItem>
              );
            })}
          </List>
        ) : (
          <EmptyState title={needle ? 'No one matches that search' : 'No one from this set yet'}
            body={needle ? 'Try a first name, a city or a profession.' : "Share the app in the set's WhatsApp group so classmates can register."} />
        )}
      </Section>

      {counts.length > 1 && (
        <Section title="All sets">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {counts.map(([y, n]) => (
              <Pressable key={y} accessibilityRole="button" accessibilityState={{ selected: y === year }} onPress={() => setYear(y)}
                style={{ width: '31%', flexGrow: 1, borderRadius: radius - 2, borderWidth: 1, padding: 10, borderColor: y === year ? t.green : t.line, backgroundColor: y === year ? t.greenSoft : t.surface }}>
                <Text style={{ fontFamily: font.display, fontSize: 18, color: t.ink }}>{y}</Text>
                <Small>{n} member{n === 1 ? '' : 's'}</Small>
              </Pressable>
            ))}
          </View>
        </Section>
      )}
    </Screen>
  );
}
