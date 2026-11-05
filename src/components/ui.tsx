import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { initials } from '@/lib/dates';
import { avatarColor, font, radius, useTheme } from '@/lib/theme';
import { Icon, type IconName } from './icons';

/* ---------- text ---------- */

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text accessibilityRole="header" style={[{ fontFamily: font.display, fontSize: 28, lineHeight: 33, color: t.ink, letterSpacing: -0.2 }, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text accessibilityRole="header" style={[{ fontFamily: font.display, fontSize: 19, lineHeight: 24, color: t.ink }, style]}>{children}</Text>;
}
export function H3({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ fontFamily: font.displaySemi, fontSize: 17, lineHeight: 22, color: t.ink }, style]}>{children}</Text>;
}
export function Body({ children, style, muted, numberOfLines, selectable }: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; numberOfLines?: number; selectable?: boolean }) {
  const t = useTheme();
  return <Text selectable={selectable} numberOfLines={numberOfLines} style={[{ fontFamily: font.body, fontSize: 15, lineHeight: 22, color: muted ? t.muted : t.ink }, style]}>{children}</Text>;
}
export function Small({ children, style, muted = true, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; numberOfLines?: number }) {
  const t = useTheme();
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: muted ? t.muted : t.ink }, style]}>{children}</Text>;
}
export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const t = useTheme();
  return <Text style={{ fontFamily: font.bold, fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase', color: color ?? t.muted }}>{children}</Text>;
}

/* ---------- layout ---------- */

/** Scrollable screen body with pull-to-refresh. */
export function Screen({ children, onRefresh, refreshing = false, header }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; header?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 22 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.green} colors={[t.green]} /> : undefined}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Screen for forms that open on top of the app. */
export function FormScreen({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 10, paddingBottom: 10, gap: 12 }}>
        <H2 style={{ flex: 1 }}>{title}</H2>
        <IconButton icon="x" label="Close" onPress={onClose} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Section({ title, action, children, style }: { title?: string; action?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 10 }, style]}>
      {(title || action) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {title ? <H2>{title}</H2> : <View />}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'gold' | 'green' }) {
  const t = useTheme();
  const bg = tone === 'gold' ? t.goldSoft : tone === 'green' ? t.greenSoft : t.surface;
  return <View style={[{ backgroundColor: bg, borderRadius: radius, borderWidth: tone ? 0 : 1, borderColor: t.line, padding: 14, gap: 8 }, style]}>{children}</View>;
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap }, style]}>{children}</View>;
}

/** A grouped list with dividers. */
export function List({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={{ backgroundColor: t.surface, borderRadius: radius, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>{children}</View>;
}
export function ListItem({ children, first }: { children: ReactNode; first?: boolean }) {
  const t = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: t.line }}>{children}</View>;
}

/* ---------- controls ---------- */

type Variant = 'primary' | 'ghost' | 'gold' | 'danger';
export function Button({ title, onPress, variant = 'primary', icon, small, disabled, loading, block, accessibilityLabel }: {
  title: string; onPress: () => void; variant?: Variant; icon?: IconName; small?: boolean; disabled?: boolean; loading?: boolean; block?: boolean; accessibilityLabel?: string;
}) {
  const t = useTheme();
  const bg = { primary: t.green, ghost: t.surface, gold: t.gold, danger: t.red }[variant];
  const fg = { primary: t.onGreen, ghost: t.ink, gold: '#2B2000', danger: '#FFFFFF' }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        minHeight: small ? 36 : 48, paddingHorizontal: small ? 12 : 18, borderRadius: small ? 10 : 12,
        backgroundColor: bg, borderWidth: variant === 'ghost' ? 1 : 0, borderColor: t.line,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1, alignSelf: block ? 'stretch' : 'flex-start',
      })}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={{ fontFamily: font.semi, fontSize: small ? 14 : 15.5, color: fg }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, badge }: { icon: IconName; label: string; onPress: () => void; badge?: number }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={badge ? `${label}, ${badge} new` : label} onPress={onPress} hitSlop={6}
      style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
      <Icon name={icon} size={20} color={t.ink} />
      {!!badge && (
        <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: t.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.surface }}>
          <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: 10.5 }}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Small outlined action, e.g. "Share" under a post. */
export function Action({ label, icon, onPress, active, danger }: { label?: string; icon?: IconName; onPress: () => void; active?: boolean; danger?: boolean }) {
  const t = useTheme();
  const color = active ? t.onGreen : danger ? t.red : t.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: active ? t.green : t.line, backgroundColor: active ? t.green : 'transparent', opacity: pressed ? 0.8 : 1 })}>
      {icon && <Icon name={icon} size={16} color={color} />}
      {label ? <Text style={{ fontFamily: font.semi, fontSize: 13, color }}>{label}</Text> : null}
    </Pressable>
  );
}

export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={{ fontFamily: font.semi, fontSize: 14, color: t.green }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, tone = 'plain' }: { label: string; tone?: 'plain' | 'green' | 'red' | 'gold' }) {
  const t = useTheme();
  const bg = { plain: t.sunk, green: t.greenSoft, red: t.redSoft, gold: t.goldSoft }[tone];
  const fg = { plain: t.muted, green: t.green, red: t.red, gold: t.goldInk }[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 }}>
      <Text style={{ fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.3, color: fg }}>{label}</Text>
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const t = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: t.sunk, borderRadius: 12, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: on ? t.surface : 'transparent' }}>
            <Text numberOfLines={1} style={{ fontFamily: font.semi, fontSize: 14, color: on ? t.ink : t.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, hint, error, ...input }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      <TextInput
        placeholderTextColor={t.muted}
        accessibilityLabel={label}
        {...input}
        onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
        style={[{
          minHeight: input.multiline ? 120 : 50, borderRadius: 11, borderWidth: focused ? 2 : 1, borderColor: error ? t.red : focused ? t.green : t.line,
          backgroundColor: t.surface, paddingHorizontal: 13, paddingVertical: input.multiline ? 12 : 0, fontFamily: font.body, fontSize: 16, color: t.ink,
          textAlignVertical: input.multiline ? 'top' : 'center',
        }, input.style]}
      />
      {error ? <Small style={{ color: t.red, fontFamily: font.semi }}>{error}</Small> : hint ? <Small>{hint}</Small> : null}
    </View>
  );
}

/** A tappable field that opens a list of choices. */
export function Picker<T extends string | number>({ label, value, options, onChange, placeholder = 'Choose', hint }: {
  label: string; value: T | null; options: { value: T; label: string }[]; onChange: (v: T) => void; placeholder?: string; hint?: string;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = options.find((o) => o.value === value);
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${current?.label ?? placeholder}`} onPress={() => setOpen(true)}
        style={{ minHeight: 50, borderRadius: 11, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: font.body, fontSize: 16, color: current ? t.ink : t.muted }}>{current?.label ?? placeholder}</Text>
        <Icon name="right" size={16} color={t.muted} />
      </Pressable>
      {hint ? <Small>{hint}</Small> : null}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: t.scrim }} onPress={() => setOpen(false)} accessibilityLabel="Close list" />
        <View style={{ maxHeight: '75%', backgroundColor: t.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: insets.bottom + 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 12 }}>
            <H2 style={{ flex: 1 }}>{label}</H2>
            <IconButton icon="x" label="Close" onPress={() => setOpen(false)} />
          </View>
          {options.length > 12 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={t.muted} accessibilityLabel={`Search ${label}`}
                style={{ minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, paddingHorizontal: 12, fontFamily: font.body, fontSize: 16, color: t.ink }} />
            </View>
          )}
          <ScrollView keyboardShouldPersistTaps="handled">
            {shown.map((o) => (
              <Pressable key={String(o.value)} accessibilityRole="button" accessibilityState={{ selected: o.value === value }}
                onPress={() => { onChange(o.value); setOpen(false); setQ(''); }}
                style={({ pressed }) => ({ paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: pressed ? t.sunk : 'transparent' })}>
                <Text style={{ fontFamily: o.value === value ? font.semi : font.body, fontSize: 16, color: t.ink, flex: 1 }}>{o.label}</Text>
                {o.value === value && <Icon name="check" size={18} color={t.green} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export function Avatar({ id, name, size = 40, ring }: { id: string; name: string; size?: number; ring?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(id), alignItems: 'center', justifyContent: 'center', borderWidth: ring ? 3 : 0, borderColor: t.gold }}>
      <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, borderRadius: radius, padding: 22, alignItems: 'center', gap: 8 }}>
      <H3 style={{ textAlign: 'center' }}>{title}</H3>
      <Body muted style={{ textAlign: 'center' }}>{body}</Body>
      {action}
    </View>
  );
}

export function Notice({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'red' | 'green' }) {
  const t = useTheme();
  const c = { gold: t.gold, red: t.red, green: t.green }[tone];
  return (
    <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderLeftWidth: 4, borderLeftColor: c, borderRadius: 12, padding: 12 }}>
      <Body style={{ fontSize: 14 }}>{children}</Body>
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  const t = useTheme();
  if (!message) return null;
  return <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.semi, fontSize: 14, color: t.red }}>{message}</Text>;
}

export function Crest({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.25, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: size * 0.06 }}>
      <Image source={require('@/assets/images/crest.png')} style={{ width: '100%', height: '100%' }} contentFit="contain" accessibilityLabel="Ibadan City Academy crest" />
    </View>
  );
}

/** The crest's four quarters as a thin band. */
export function CrestStripe() {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', height: 5 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[t.red, t.gold, t.green, t.line].map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}
    </View>
  );
}

export function Loading() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
      <ActivityIndicator color={t.green} size="large" />
    </View>
  );
}
