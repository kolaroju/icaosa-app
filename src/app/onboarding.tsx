import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileForm } from '@/components/profile-form';
import { Body, Crest, CrestStripe, ErrorText, Eyebrow, H1, LinkButton, Small } from '@/components/ui';
import { errorText, useSaveProfile } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useTheme } from '@/lib/theme';

export default function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { userId, email, signOut } = useSession();
  const save = useSaveProfile(userId ?? '');
  const [error, setError] = useState<string | null>(null);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: insets.top, backgroundColor: t.surface }}><CrestStripe /></View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Crest size={64} />
          <View style={{ flex: 1, gap: 4 }}>
            <Eyebrow color={t.goldInk}>One last step</Eyebrow>
            <H1>Join your set</H1>
          </View>
        </View>
        <Body muted>Choose the year you graduated. You’ll see your set’s feed, events, dues and birthdays straight away.</Body>
        <ProfileForm
          submitLabel="Join my set"
          busy={save.isPending}
          onSubmit={async (p) => {
            setError(null);
            try { await save.mutateAsync(p); } catch (e) { setError(errorText(e)); }
          }}
          footer={<>
            <ErrorText message={error} />
            <Small>Only the day and month of your birthday are kept, never the year. Members of the association can see your name, set, city, occupation and WhatsApp number.</Small>
            <Small>Signed in as {email}. </Small>
            <LinkButton label="Use a different email" onPress={signOut} />
          </>}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
