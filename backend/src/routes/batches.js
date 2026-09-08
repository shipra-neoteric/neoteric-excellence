import { Router } from 'express';
import Attendance from '../models/Attendance.js';
import Batch from '../models/Batch.js';
import DailyLog from '../models/DailyLog.js';
import Day from '../models/Day.js';
import Person from '../models/Person.js';
import Trainee from '../models/Trainee.js';
import { requirePermission } from '../middleware/auth.js';
import { writeMonthlyPack } from '../reports/monthlyPack.js';
import { band, getCheckpoint, logAvg, podNumber, velocity } from '../services/traineeStats.js';

const router = Router();

async function findBatch(slug) {
  return Batch.findOne({ slug });
}

function formatDayLabel(date) {
  const day = date.getUTCDate();
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const weekday = date.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return `${day} ${month} · ${weekday}`;
}

// The day calendar used to be a fixed, one-time-seeded list (10 days, Sept 1-11) with
// no way to add to it — the day picker defaulted to whichever day was LAST in that
// list, not today's actual date, so every real submission landed on Sept 11 regardless
// of when it was actually made, and the whole calendar would have simply run out after
// Sept 11 with nowhere to log anything. Now: every time the day list is requested,
// today's Day is auto-created if it doesn't exist yet, so the calendar keeps pace with
// the real world indefinitely and there's always a "today" to default to.
async function ensureTodayDay(batch) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

  const existing = await Day.findOne({ batch: batch._id, date: todayStart });
  if (existing) return existing;

  const days = await Day.find({ batch: batch._id }).select('code').lean();
  const usedNums = days.map((d) => parseInt(String(d.code).replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n));
  const nextNum = (usedNums.length ? Math.max(...usedNums) : 0) + 1;
  const code = 'D' + String(nextNum).padStart(2, '0');

  return Day.create({ batch: batch._id, code, date: todayStart, label: formatDayLabel(todayStart) });
}

// GET /api/batches/:id/dashboard — tiles, alerts, band counts (SPEC.md §3)
router.get('/:id/dashboard', async (req, res, next) => {
  try {
    const batch = await findBatch(req.params.id);
    if (!batch) return res.status(404).json({ error: 'unknown batch' });

    const days = await Day.find({ batch: batch._id }).sort('date').lean();
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = days.find((d) => d.date.toISOString().slice(0, 10) === todayStr) ?? days[days.length - 1] ?? null;

    const trainees = await Trainee.find({ batch: batch._id }).lean();
    const total = trainees.length;

    const [todayAtt, todayLogs] = today
      ? await Promise.all([
        Attendance.find({ day: today._id }).lean(),
        DailyLog.find({ day: today._id, score: { $ne: null } }).lean(),
      ])
      : [[], []];

    const bandCounts = { A: 0, B: 0, C: 0, D: 0, pending: 0 };
    const velocities = [];
    const logAvgs = [];
    const dBandTrainees = [];
    for (const t of trainees) {
      const assessment = await getCheckpoint(t._id);
      const chk = assessment?.total ?? null;
      const b = band(t.baselineScore, chk);
      bandCounts[b ?? 'pending']++;
      const v = velocity(t.baselineScore, chk);
      if (v != null) velocities.push(v);
      const la = await logAvg(t._id);
      if (la != null) logAvgs.push(la);
      if (b === 'D') dBandTrainees.push(t);
    }
    const avgVelocity = velocities.length ? Math.round(velocities.reduce((a, b2) => a + b2, 0) / velocities.length) : null;
    const avgLogQuality = logAvgs.length ? Number((logAvgs.reduce((a, b2) => a + b2, 0) / logAvgs.length).toFixed(2)) : null;

    const logTrend = [];
    for (const d of days) {
      const scored = await DailyLog.find({ day: d._id, score: { $ne: null } }).select('score').lean();
      if (scored.length) {
        logTrend.push({ code: d.code, avg: Number((scored.reduce((a, l) => a + l.score, 0) / scored.length).toFixed(2)) });
      }
    }

    const alerts = [];
    if (dBandTrainees.length) {
      const names = await Person.find({ _id: { $in: dBandTrainees.map((t) => t.person) } }).select('name').lean();
      alerts.push({
        level: 'crit',
        text: `${dBandTrainees.length} trainee${dBandTrainees.length > 1 ? 's' : ''} in band D — ${names.map((p) => p.name).join(', ')}. This needs a written conversation with Deepti now, not a surprise at the Gateway.`,
      });
    }
    if (today && todayAtt.length < total) {
      alerts.push({ level: 'warn', text: `${total - todayAtt.length} attendance entries missing for ${today.code}.` });
    }

    res.json({
      today: today
        ? { id: today._id.toString(), code: today.code, label: today.label, date: today.date.toISOString().slice(0, 10) }
        : null,
      total,
      present: todayAtt.filter((a) => a.status === 'P').length,
      filled: todayAtt.length,
      logged: todayLogs.length,
      avgLogQuality,
      avgVelocity,
      bandCounts,
      alerts,
      logTrend,
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/batches/:id/days/:code — the daily entry grid for one day
router.get('/:id/days/:code', async (req, res, next) => {
  try {
    const batch = await findBatch(req.params.id);
    if (!batch) return res.status(404).json({ error: 'unknown batch' });
    const day = await Day.findOne({ batch: batch._id, code: req.params.code });
    if (!day) return res.status(404).json({ error: 'unknown day' });

    const trainees = await Trainee.find({ batch: batch._id }).populate('person').populate('pod').lean();
    const [attendanceDocs, logDocs] = await Promise.all([
      Attendance.find({ day: day._id }).lean(),
      DailyLog.find({ day: day._id }).lean(),
    ]);
    const attByTrainee = Object.fromEntries(attendanceDocs.map((a) => [String(a.trainee), a]));
    const logByTrainee = Object.fromEntries(logDocs.map((l) => [String(l.trainee), l]));

    const rows = trainees.map((t) => ({
      trainee_id: t.code,
      name: t.person.name,
      pod: podNumber(t.pod),
      attendance: attByTrainee[String(t._id)]?.status ?? null,
      log_score: logByTrainee[String(t._id)]?.score ?? null,
      log_note: logByTrainee[String(t._id)]?.note ?? '',
      // The trainee's own 6-prompt write-up, so staff aren't scoring blind.
      log_body: logByTrainee[String(t._id)]?.bodyJson ?? null,
    }));

    res.json({
      day: { id: day._id.toString(), code: day.code, date: day.date.toISOString().slice(0, 10), label: day.label },
      rows,
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/batches/:id/days — list of days, for the day picker. Ensures today's day
// exists before listing (see ensureTodayDay above).
router.get('/:id/days', async (req, res, next) => {
  try {
    const batch = await findBatch(req.params.id);
    if (!batch) return res.status(404).json({ error: 'unknown batch' });
    await ensureTodayDay(batch);
    const days = await Day.find({ batch: batch._id }).sort('date').lean();
    res.json(days.map((d) => ({
      id: d._id.toString(), code: d.code, date: d.date.toISOString().slice(0, 10), label: d.label,
    })));
  } catch (e) {
    next(e);
  }
});

// GET /api/batches/:id/report?month=YYYY-MM — the monthly pack, as a PDF
// "Export the monthly pack" is Rajat/Deepti/Bharti (SPEC.md §4).
router.get('/:id/report', requirePermission('reports', 'view'), async (req, res, next) => {
  try {
    const batch = await findBatch(req.params.id);
    if (!batch) return res.status(404).json({ error: 'unknown batch' });
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    await writeMonthlyPack(res, { batchId: batch.slug, batch, month });
  } catch (e) {
    next(e);
  }
});

export default router;
