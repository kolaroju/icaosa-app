// Web-only behaviour for the browser version of ICAOSA (used by iPhone members).
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/** Adds the tags that let iPhones and Android browsers install ICAOSA on the home screen. */
export function useWebAppHead() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = 'ICAOSA';
    const tags: [string, Record<string, string>][] = [
      ['link', { rel: 'manifest', href: '/manifest.json' }],
      ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
      ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
      ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
      ['meta', { name: 'apple-mobile-web-app-title', content: 'ICAOSA' }],
      ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
      ['meta', { name: 'theme-color', content: '#1C6A39' }],
      ['meta', { name: 'description', content: 'Ibadan City Academy Old Students Association: your set’s news, events, dues and birthdays.' }],
    ];
    for (const [tag, attrs] of tags) {
      const key = attrs.rel ?? attrs.name;
      if (document.head.querySelector(`${tag}[${attrs.rel ? 'rel' : 'name'}="${key}"]`)) continue;
      const el = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      document.head.appendChild(el);
    }
  }, []);
}

/**
 * Paystack sends web members back to /?paystack=1&reference=... after paying.
 * Once the member is signed in, open the payment result and tidy the address bar.
 */
export function useWebPaymentReturn(ready: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !ready || typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (!q.get('paystack')) return;
    const reference = q.get('reference') ?? q.get('trxref') ?? '';
    const cancelled = q.get('cancelled') ? '1' : '';
    window.history.replaceState(null, '', '/');
    router.push({ pathname: '/payment-complete', params: { reference, ...(cancelled ? { cancelled } : {}) } });
  }, [ready]);
}

/** True in iPhone Safari when ICAOSA has not been added to the home screen yet. */
export function shouldSuggestInstall(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches);
  return ios && !standalone;
}
