import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { fmtDate, fmtTime, parseISODate, toISODate } from '@/lib/dates';
import { font, useTheme } from '@/lib/theme';
import { Icon } from './icons';
import { Eyebrow, LinkButton } from './ui';

/** Date or time field. Value is 'YYYY-MM-DD' for dates and 'HH:MM' for times. */
export function DateField({ label, mode, value, onChange, minimumDate, maximumDate, optional }: {
  label: string; mode: 'date' | 'time'; value: string | null; onChange: (v: string | null) => void;
  minimumDate?: Date; maximumDate?: Date; optional?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const asDate = value
    ? mode === 'date' ? parseISODate(value) : (() => { const [h, m] = value.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; })()
    : new Date();
  const shown = value ? (mode === 'date' ? fmtDate(value) : fmtTime(value)) : mode === 'date' ? 'Choose a date' : 'Choose a time';

  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Eyebrow>{label}</Eyebrow>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${shown}`} onPress={() => setOpen(true)}
        style={{ minHeight: 50, borderRadius: 11, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name={mode === 'date' ? 'cal' : 'clock'} size={18} color={t.muted} />
        <Text style={{ fontFamily: font.body, fontSize: 16, color: value ? t.ink : t.muted, flex: 1 }}>{shown}</Text>
      </Pressable>
      {optional && value && <LinkButton label="Clear" onPress={() => onChange(null)} />}
      {open && (
        <DateTimePicker
          value={asDate}
          mode={mode}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, d) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (event.type === 'dismissed' || !d) return;
            onChange(mode === 'date' ? toISODate(d) : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
          }}
        />
      )}
      {open && Platform.OS === 'ios' && <LinkButton label="Done" onPress={() => setOpen(false)} />}
    </View>
  );
}
