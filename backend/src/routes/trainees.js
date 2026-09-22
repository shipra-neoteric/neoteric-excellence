import bcrypt from 'bcryptjs';
import { Router } from 'express';
import Assessment from '../models/Assessment.js';
import Attendance from '../models/Attendance.js';
import BuddyRating from '../models/BuddyRating.js';
import ChecklistItem from '../models/ChecklistItem.js';
import DailyLog from '../models/DailyLog.js';
import Day from '../models/Day.js';
import Person from '../models/Person.js';
import Pod from '../models/Pod.js';
import Trainee from '../models/Trainee.js';
import VideoProgress from '../models/VideoProgress.js';
import { requirePermission, requireRole } from '../middleware/auth.js';
import { attPct, band, getCheckpoint, logAvg, podNumber, velocity } from '../services/traineeStats.js';

const router = Router();

async function serializeTrainee(t) {
  const assessment = await getCheckpoint(t._id);
  const chk = assessment?.total ?? null;
  return {
    id: t.code,
    name: t.person.name,
    phone: t.person.phone ?? null,
    email: t.person.email ?? null,
    branch: t.branch,
    department: t.department ?? null,
    pod: podNumber(t.pod),
    buddy: t.buddy?.name ?? null,
    status: t.status,
    baseline: t.baselineScore,
    written: assessment?.written ?? null,
    practical: assessment?.practical ?? null,
    behavioural: assessment?.behavioural ?? null,
    checkpoint: chk,
    band: band(t.baselineScore, chk),
    velocity: velocity(t.baselineScore, chk),
    log_avg: await logAvg(t._id),
    att_pct: await attPct(t._id),
  };
}

async function resolvePod(podNum) {
  return Pod.findOne({ name: `Pod ${podNum}` });
}

// Smallest unused Txx number, not "highest existing + 1" — so deleting trainees
// actually frees up their number again instead of codes only ever climbing forever
// (e.g. deleting everyone except the last person created shouldn't leave them
// permanently labeled T13).
async function nextCode() {
  const existing = await Trainee.find().select('code').lean();
  const used = new Set(existing.map((t) => parseInt(t.code.slice(1), 10)));
  let n = 1;
  while (used.has(n)) n++;
  return 'T' + String(n).padStart(2, '0');
}

// GET /api/trainees?pod= — the batch roster (staff only, SPEC.md §4)
router.get('/', requirePermission('trainees', 'view'), async (req, res, next) => {
  try {
    const { pod } = req.query;
    const filter = {};
    if (pod) {
      const podDoc = await resolvePod(pod);
      if (!podDoc) return res.json([]);
      filter.pod = podDoc._id;
    }
    const trainees = await Trainee.find(filter).populate('person').populate('pod').populate('buddy').lean();
    res.json(await Promise.all(trainees.map(serializeTrainee)));
  } catch (e) {
    next(e);
  }
});

async function traineeDetail(t) {
  const [days, attendanceDocs, logDocs] = await Promise.all([
    Day.find({ batch: t.batch }).sort('date').lean(),
    Attendance.find({ trainee: t._id }).lean(),
    DailyLog.find({ trainee: t._id }).lean(),
  ]);
  const attByDay = Object.fromEntries(attendanceDocs.map((a) => [String(a.day), a]));
  const logByDay = Object.fromEntries(logDocs.map((l) => [String(l.day), l]));

  const history = days.map((d) => ({
    code: d.code,
    label: d.label,
    attendance: attByDay[String(d._id)]?.status ?? null,
    log_score: logByDay[String(d._id)]?.score ?? null,
    log_note: logByDay[String(d._id)]?.note ?? '',
    // The trainee's own 6-prompt reflective write-up — previously written but never
    // read back anywhere, so staff scored the log blind to what was actually in it.
    log_body: logByDay[String(d._id)]?.bodyJson ?? null,
  }));

  return { ...(await serializeTrainee(t)), history };
}

// GET /api/trainees/me — own profile + history, for a logged-in trainee.
// Must stay ahead of GET /:code, or "me" would be matched as a trainee code.
router.get('/me', requireRole('trainee'), async (req, res, next) => {
  try {
    const t = await Trainee.findOne({ person: req.user.sub })
      .populate('person').populate('pod').populate('buddy').lean();
    if (!t) return res.status(404).json({ error: 'trainee record not found' });
    res.json(await traineeDetail(t));
  } catch (e) {
    next(e);
  }
});

// GET /api/trainees/:code — full profile + day-by-day history, for the detail drawer
// (staff only — a trainee sees their own via /me, not anyone else's, SPEC.md §4)
router.get('/:code', requirePermission('trainees', 'view'), async (req, res, next) => {
  try {
    const t = await Trainee.findOne({ code: req.params.code })
      .populate('person').populate('pod').populate('buddy').lean();
    if (!t) return res.status(404).json({ error: 'unknown trainee' });
    res.json(await traineeDetail(t));
  } catch (e) {
    next(e);
  }
});

// POST /api/trainees — trainee master: add a new trainee. Rajat/Deepti/Bharti (README:
// "who owns what" — all three touch trainee records).
router.post('/', requirePermission('trainees', 'create'), async (req, res, next) => {
  try {
    const { name, phone, email, password, branch, department, pod, baseline } = req.body;
    if (!name || !pod) return res.status(400).json({ error: 'name and pod are required' });
    if (password && password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });
    if (password && !email) return res.status(400).json({ error: 'email is required to set a password' });

    const podDoc = await resolvePod(pod);
    if (!podDoc) return res.status(400).json({ error: `unknown pod ${pod}` });

    const code = await nextCode();
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    const person = await Person.create({
      name, phone: phone || undefined, email: email || undefined, passwordHash, role: 'trainee',
    });
    const trainee = await Trainee.create({
      code,
      person: person._id,
      batch: podDoc.batch,
      pod: podDoc._id,
      buddy: podDoc.buddy,
      branch: branch || '',
      department: department || undefined,
      baselineScore: baseline ?? null,
      status: 'active',
    });

    const full = await Trainee.findById(trainee._id).populate('person').populate('pod').populate('buddy').lean();
    res.status(201).json(await serializeTrainee(full));
  } catch (e) {
    next(e);
  }
});

// PUT /api/trainees/:code — trainee master: edit. Baseline is write-once (SPEC.md §8).
router.put('/:code', requirePermission('trainees', 'edit'), async (req, res, next) => {
  try {
    const t = await Trainee.findOne({ code: req.params.code });
    if (!t) return res.status(404).json({ error: 'unknown trainee' });

    const { name, phone, email, password, branch, department, pod, status, baseline } = req.body;
    if (password && password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });

    if (baseline != null) {
      if (t.baselineScore != null && baseline !== t.baselineScore) {
        return res.status(400).json({ error: 'baseline is locked once set (SPEC.md §8)' });
      }
      t.baselineScore = baseline;
    }
    if (branch != null) t.branch = branch;
    if (department != null) t.department = department;
    if (status != null) t.status = status;
    if (pod != null) {
      const podDoc = await resolvePod(pod);
      if (!podDoc) return res.status(400).json({ error: `unknown pod ${pod}` });
      t.pod = podDoc._id;
      t.buddy = podDoc.buddy;
    }
    await t.save();

    if (name != null || phone != null || email != null || password) {
      const update = {};
      if (name != null) update.name = name;
      if (phone != null) update.phone = phone;
      if (email != null) update.email = email;
      if (password) update.passwordHash = await bcrypt.hash(password, 10);
      await Person.findByIdAndUpdate(t.person, update);
    }

    const full = await Trainee.findById(t._id).populate('person').populate('pod').populate('buddy').lean();
    res.json(await serializeTrainee(full));
  } catch (e) {
    next(e);
  }
});

// DELETE /api/trainees/:code — hard delete, cascading every record tied to them.
// Admin-only by default (permissions/defaults.js: delete defaults to false everywhere
// until explicitly granted through the Users admin panel).
router.delete('/:code', requirePermission('trainees', 'delete'), async (req, res, next) => {
  try {
    const t = await Trainee.findOne({ code: req.params.code });
    if (!t) return res.status(404).json({ error: 'unknown trainee' });

    await Promise.all([
      Attendance.deleteMany({ trainee: t._id }),
      DailyLog.deleteMany({ trainee: t._id }),
      Assessment.deleteMany({ trainee: t._id }),
      ChecklistItem.deleteMany({ trainee: t._id }),
      VideoProgress.deleteMany({ trainee: t._id }),
      BuddyRating.deleteMany({ trainee: t._id }),
    ]);
    await Person.findByIdAndDelete(t.person);
    await Trainee.findByIdAndDelete(t._id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
