// The app calls this when the member returns from checkout, so they see the
// result straight away. The webhook confirms payments too, if the app is closed.
import { admin, HttpError, json, readJson, requireUser, serve } from '../_shared/core.ts';
import { settle } from '../_shared/paystack.ts';

serve(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
  const user = await requireUser(req);
  const { reference } = await readJson<{ reference?: string }>(req);
  if (!reference) throw new HttpError(400, 'Missing payment reference.');
  const { data: pay } = await admin().from('payments').select('user_id').eq('reference', reference).maybeSingle();
  if (!pay || pay.user_id !== user.id) throw new HttpError(404, 'We could not find that payment.');
  const status = await settle(reference);
  return json({ status });
});
