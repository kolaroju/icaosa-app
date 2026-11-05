// Runs every morning (see supabase/schedule-reminders.sql):
//  - birthday wishes, to the celebrant and to their set
//  - reminders for events happening tomorrow
//  - dues reminders on the 1st and 20th of the month, to members who haven't paid
import { admin, env, json, lagosToday, MONTHS, naira, setLabel } from '../_shared/core.ts';
import { notify, sendToUsers } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return new Response('Forbidden', { status: 403 });
  const today = lagosToday();
  const tomorrow = lagosToday(1);
  const report: Record<string, number> = { birthdays: 0, events: 0, dues: 0 };

  // Birthdays
  const { data: celebrants } = await admin().from('profiles').select('id, full_name, set_year, notify')
    .eq('bd_day', today.d).eq('bd_month', today.m);
  for (const c of celebrants ?? []) {
    report.birthdays += await sendToUsers([c.id], {
      title: 'Happy birthday from ICAOSA!',
      body: `Many happy returns, ${c.full_name.split(/\s+/)[0]}. The whole ${setLabel(c.set_year)} is celebrating you today.`,
      data: { screen: '/' },
    });
    report.birthdays += await notify({ setYear: c.set_year, exclude: [c.id] }, 'birthdays', {
      title: `It's ${c.full_name}'s birthday`,
      body: `Send ${c.full_name.split(/\s+/)[0]} your wishes in the ${setLabel(c.set_year)} feed.`,
      data: { screen: '/', celebrant: c.id },
    });
  }

  // Events tomorrow
  const { data: events } = await admin().from('events').select('id, title, set_year, start_time, venue').eq('starts_on', tomorrow.iso);
  for (const e of events ?? []) {
    const time = e.start_time ? ` at ${String(e.start_time).slice(0, 5)}` : '';
    report.events += await notify({ setYear: e.set_year }, 'events', {
      title: `Tomorrow: ${e.title}`,
      body: `${setLabel(e.set_year)}${time}${e.venue ? ' · ' + e.venue : ''}`,
      data: { screen: '/events' },
    });
  }

  // Dues reminders
  if (today.d === 1 || today.d === 20) {
    const month = `${today.y}-${String(today.m).padStart(2, '0')}`;
    const { data: sets } = await admin().from('sets').select('year, dues_amount').gt('dues_amount', 0);
    for (const s of sets ?? []) {
      const { data: members } = await admin().from('profiles').select('id').eq('set_year', s.year);
      const { data: paid } = await admin().from('payments').select('user_id')
        .eq('kind', 'dues').in('status', ['pending', 'confirmed']).contains('months', [month]);
      const paidIds = new Set((paid ?? []).map((p) => p.user_id));
      const due = (members ?? []).map((m) => m.id as string).filter((id) => !paidIds.has(id));
      if (!due.length) continue;
      report.dues += await notify({ userIds: due }, 'dues', {
        title: today.d === 1 ? `${MONTHS[today.m - 1]} dues are open` : `Reminder: ${MONTHS[today.m - 1]} dues`,
        body: `Your ${setLabel(s.year)} dues of ${naira(s.dues_amount)} for ${MONTHS[today.m - 1]} ${today.d === 1 ? 'are now due' : 'are still outstanding'}. Tap to pay.`,
        data: { screen: '/dues' },
      });
    }
  }

  return json({ date: today.iso, sent: report });
});
