import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, CrestStripe, ErrorText, Eyebrow, Field, H1, LinkButton, Notice, Small } from '@/components/ui';
import { errorText } from '@/lib/api';
import { shouldSuggestInstall } from '@/lib/web';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

const REVIEW_EMAIL = process.env.EXPO_PUBLIC_REVIEW_EMAIL?.trim().toLowerCase() || null;

// Members sign in with a code (usually 6 digits) sent to their email. No passwords to forget.
export default function SignIn() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');

  // App Store and Play Store reviewers can't receive our email codes, so one
  // review account (set in eas.json) signs in with a password instead.
  const reviewSignIn = async () => {
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError('That password is not right.');
  };

  const sendCode = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setError('Enter a valid email address.');
    if (REVIEW_EMAIL && e === REVIEW_EMAIL) { setEmail(e); setStep('password'); setError(null); return; }
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email: e, options: { shouldCreateUser: true } });
    setBusy(false);
    if (err) return setError(errorText(err));
    setEmail(e); setStep('code');
  };

  const verify = async () => {
    if (!/^\d{6,10}$/.test(code.trim())) return setError('Enter the code from the email.');
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setBusy(false);
    if (err) setError(/expired|invalid/i.test(err.message) ? 'That code is wrong or has expired. Request a new one.' : errorText(err));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: insets.top, backgroundColor: t.surface }}><CrestStripe /></View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40, gap: 22 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: 112, height: 112, borderRadius: 26, backgroundColor: '#FFFFFF', padding: 8 }}>
          <Image source={require('@/assets/images/crest.png')} style={{ width: '100%', height: '100%' }} contentFit="contain" accessibilityLabel="Ibadan City Academy crest" />
        </View>
        <View style={{ gap: 8 }}>
          <Eyebrow color={t.goldInk}>Pro Bono Publico</Eyebrow>
          <H1>Welcome home, old student.</H1>
          <Body muted>Your set’s news, invites, events, dues and birthdays, all in one place.</Body>
        </View>

        {shouldSuggestInstall() && (
          <Notice tone="green">On iPhone: tap the Share button at the bottom of Safari, then “Add to Home Screen”, to keep ICAOSA on your home screen like an app.</Notice>
        )}

        {step === 'email' ? (
          <View style={{ gap: 14 }}>
            <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
              keyboardType="email-address" textContentType="emailAddress" placeholder="you@example.com" returnKeyType="send" onSubmitEditing={sendCode} />
            <ErrorText message={error} />
            <Button title="Send me a sign-in code" onPress={sendCode} loading={busy} block />
            <Small>New here? The same step creates your account. You’ll register into your set next.</Small>
          </View>
        ) : step === 'password' ? (
          <View style={{ gap: 14 }}>
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={reviewSignIn} />
            <ErrorText message={error} />
            <Button title="Sign in" onPress={reviewSignIn} loading={busy} block />
            <LinkButton label="Use another email" onPress={() => { setStep('email'); setPassword(''); setError(null); }} />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Body>We sent a sign-in code to <Body style={{ fontWeight: '600' }}>{email}</Body>. It can take a minute to arrive; check spam too.</Body>
            <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
              maxLength={10} placeholder="123456" returnKeyType="done" onSubmitEditing={verify} style={{ fontSize: 22, letterSpacing: 6 }} />
            <ErrorText message={error} />
            <Button title="Sign in" onPress={verify} loading={busy} block />
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <LinkButton label="Send a new code" onPress={sendCode} />
              <LinkButton label="Use another email" onPress={() => { setStep('email'); setCode(''); setError(null); }} />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
