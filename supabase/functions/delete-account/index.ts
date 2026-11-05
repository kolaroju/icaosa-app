// Lets members delete their account from inside the app (required by Apple
// and Google). Their profile, posts, RSVPs and devices are removed; payment
// records stay with the set's accounts but are no longer linked to them.
import { admin, HttpError, json, requireUser, serve } from '../_shared/core.ts';

serve(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
  const user = await requireUser(req);
  const { error } = await admin().auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({ deleted: true });
});
