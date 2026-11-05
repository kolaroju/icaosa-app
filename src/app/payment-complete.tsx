import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, FormScreen, Notice, Small } from '@/components/ui';
import { keys } from '@/lib/api';
import { verifyPayment } from '@/lib/pay';

// Paystack sends members here (icaosa://payment-complete) after checkout,
// for example after finishing a donation in Safari.
export default function PaymentComplete() {
  const qc = useQueryClient();
  const { reference, cancelled } = useLocalSearchParams<{ reference?: string; cancelled?: string }>();
  const [status, setStatus] = useState<'checking' | 'confirmed' | 'pending' | 'failed'>(reference && !cancelled ? 'checking' : 'pending');

  useEffect(() => {
    if (!reference || cancelled) return;
    verifyPayment(reference).then((s) => {
      setStatus(s);
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: keys.appeals });
    });
  }, [reference, cancelled, qc]);

  const text = {
    checking: 'Checking your payment with Paystack…',
    confirmed: 'Payment received. Thank you!',
    pending: cancelled ? 'You left checkout before paying, so nothing was charged.' : 'Your payment is still being processed. It will show as received in Dues within a few minutes.',
    failed: "The payment didn't go through, so you weren't charged.",
  }[status];

  return (
    <FormScreen title="Payment" onClose={() => router.back()}>
      <Notice tone={status === 'confirmed' ? 'green' : status === 'failed' ? 'red' : 'gold'}>{text}</Notice>
      {reference && <Small>Reference: {reference}</Small>}
      <Button title="Go to Dues" onPress={() => router.replace('/dues')} block />
    </FormScreen>
  );
}
