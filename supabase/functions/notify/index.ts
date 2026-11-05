// The app calls this right after a member posts, adds an event or starts an
// appeal, so the rest of the set gets a push notification.
import { admin, HttpError, json, readJson, requireUser, serve, setLabel } from '../_shared/core.ts';
import { notify } from '../_shared/push.ts';

type Body = { type: 'post' | 'event' | 'appeal'; id: string };

serve(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
  const user = await requireUser(req);
  const { type, id } = await readJson<Body>(req);
  const table = { post: 'posts', event: 'events', appeal: 'appeals' }[type];
  if (!table || !id) throw new HttpError(400, 'Say what to announce.');

  const { data: row } = await admin().from(table).select('*').eq('id', id).maybeSingle();
  if (!row || row.author_id !== user.id) throw new HttpError(404, 'Nothing to announce.');
  if (Date.now() - new Date(row.created_at).getTime() > 15 * 60e3) return json({ sent: 0 }); // only fresh items

  const { data: author } = await admin().from('profiles').select('full_name').eq('id', user.id).single();
  const first = (author?.full_name ?? 'A member').split(/\s+/)[0];
  const scope = setLabel(row.set_year);
  const audience = { setYear: row.set_year as number | null, exclude: [user.id] };

  let sent = 0;
  if (type === 'post') {
    const kind = row.kind as string;
    sent = await notify(audience, kind === 'celebration' ? 'birthdays' : 'posts', {
      title: kind === 'announcement' ? `${scope} announcement` : kind === 'invite' ? `${first} sent an invite` : kind === 'celebration' ? row.title : `${scope}: ${first} posted`,
      body: kind === 'celebration' ? (row.body ?? '') : row.title,
      data: { screen: '/feed' },
    });
  } else if (type === 'event') {
    const d = new Date(`${row.starts_on}T12:00:00Z`);
    const when = d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    sent = await notify(audience, 'events', {
      title: `New ${scope} event`,
      body: `${row.title} · ${when}${row.venue ? ' · ' + row.venue : ''}`,
      data: { screen: '/events' },
    });
  } else {
    sent = await notify(audience, 'dues', {
      title: `${scope} appeal`,
      body: row.title,
      data: { screen: '/dues' },
    });
  }
  return json({ sent });
});
