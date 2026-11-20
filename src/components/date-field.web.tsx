// Web version of DateField: the browser's own date and time pickers.
import { View } from 'react-native';

import { toISODate } from '@/lib/dates';
import { font, useTheme } from '@/lib/theme';
import { Eyebrow, LinkButton } from './ui';

export function DateField({ label, mode, value, onChange, minimumDate, maximumDate, optional }: {
  label: string; mode: 'date' | 'time'; value: string | null; onChange: (v: string | null) => void;
  minimumDate?: Date; maximumDate?: Date; optional?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Eyebrow>{label}</Eyebrow>
      <input
        type={mode}
        aria-label={label}
        value={value ?? ''}
        min={mode === 'date' && minimumDate ? toISODate(minimumDate) : undefined}
        max={mode === 'date' && maximumDate ? toISODate(maximumDate) : undefined}
        onChange={(e) => onChange(e.currentTarget.value || null)}
        style={{
          minHeight: 50, borderRadius: 11, border: `1px solid ${t.line}`, background: t.surface, color: t.ink,
          padding: '0 13px', fontFamily: font.body, fontSize: 16, colorScheme: t.dark ? 'dark' : 'light', boxSizing: 'border-box', width: '100%',
        }}
      />
      {optional && value && <LinkButton label="Clear" onPress={() => onChange(null)} />}
    </View>
  );
}
