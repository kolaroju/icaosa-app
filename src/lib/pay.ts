import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { callFunction } from './api';

export type PayRequest =
  | { kind: 'dues'; months: string[] }
  | { kind: 'donation'; appealId: string | null; amount: number };

export type PayResult = { status: 'confirmed' | 'pending' | 'failed' | 'opened-in-safari'; reference: string };

/**
 * Opens Paystack checkout and, when the member comes back, asks the server to
 * confirm the payment. Paystack's webhook also confirms it in the background,
 * so a slow network never loses a payment.
 *
 * Apple only lets apps that are not approved nonprofits take donations outside
 * the app, so on iPhone donations open in Safari instead of inside the app.
 */
export async function payWithPaystack(req: PayRequest): Promise<PayResult> {
  const { authorizationUrl, reference } = await callFunction<{ authorizationUrl: string; reference: string }>('paystack-init', req);

  if (Platform.OS === 'ios' && req.kind === 'donation') {
    await Linking.openURL(authorizationUrl);
    return { status: 'opened-in-safari', reference };
  }

  await WebBrowser.openAuthSessionAsync(authorizationUrl, Linking.createURL('payment-complete'));
  return { status: await verifyPayment(reference), reference };
}

export async function verifyPayment(reference: string): Promise<'confirmed' | 'pending' | 'failed'> {
  try {
    const { status } = await callFunction<{ status: 'confirmed' | 'pending' | 'failed' }>('paystack-verify', { reference });
    return status;
  } catch {
    return 'pending';
  }
}
