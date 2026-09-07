import { Router } from 'express';
import { getDefaultBatch } from '../db/seed.js';
import Pod from '../models/Pod.js';
import Rotation from '../models/Rotation.js';
import Trainee from '../models/Trainee.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

function serialize(pod) {
  return {
    id: pod._id.toString(),
    name: pod.name,
    buddyId: pod.buddy?._id?.toString() ?? null,
    buddyName: pod.buddy?.name ?? null,
  };
}

// Smallest unused "Pod N" number — same gap-filling approach as trainee codes
// (trainees.js), so deleting a pod frees its number instead of numbers only climbing.
async function nextPodName() {
  const pods = await Pod.find().select('name').lean();
  const used = new Set(pods.map((p) => parseInt(String(p.name).replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n)));
  let n = 1;
  while (used.has(n)) n++;
  return `Pod ${n}`;
}

// GET /api/pods — every pod and its current buddy (any authenticated staff)
router.get('/', async (req, res, next) => {
  try {
    const pods = await Pod.find().populate('buddy').sort('name').lean();
    res.json(pods.map(serialize));
  } catch (e) {
    next(e);
  }
});

// POST /api/pods — {buddyId?} — add a new pod at runtime. Previously pods only ever
// existed via the one-time seed (4, fixed forever) — no way to grow the program past
// that without editing the database directly. Name is auto-generated ("Pod N") since
// podNumber() (traineeStats.js) parses the number out of it everywhere else.
router.post('/', requirePermission('trainees', 'edit'), async (req, res, next) => {
  try {
    const batch = await getDefaultBatch();
    if (!batch) return res.status(400).json({ error: 'no batch to attach this pod to' });

    const { buddyId } = req.body;
    const name = await nextPodName();
    const pod = await Pod.create({ batch: batch._id, name, buddy: buddyId || undefined });
    const full = await Pod.findById(pod._id).populate('buddy').lean();
    res.status(201).json(serialize(full));
  } catch (e) {
    next(e);
  }
});

// PUT /api/pods/:id — {buddyId} — reassign a pod's buddy. Cascades to every trainee
// currently in that pod, since Trainee.buddy is a denormalized snapshot, not a live
// join (see backend/src/routes/trainees.js).
router.put('/:id', requirePermission('trainees', 'edit'), async (req, res, next) => {
  try {
    const { buddyId } = req.body;
    if (!buddyId) return res.status(400).json({ error: 'buddyId required' });

    const pod = await Pod.findByIdAndUpdate(req.params.id, { buddy: buddyId }, { new: true }).populate('buddy');
    if (!pod) return res.status(404).json({ error: 'unknown pod' });

    await Trainee.updateMany({ pod: pod._id }, { buddy: buddyId });

    res.json(serialize(pod));
  } catch (e) {
    next(e);
  }
});

// DELETE /api/pods/:id — refuses if any trainee is still assigned to it (move them
// first); cascades any rotation-schedule rows so nothing is left pointing at a
// deleted pod.
router.delete('/:id', requirePermission('trainees', 'delete'), async (req, res, next) => {
  try {
    const traineeCount = await Trainee.countDocuments({ pod: req.params.id });
    if (traineeCount > 0) {
      return res.status(400).json({ error: `${traineeCount} trainee(s) still assigned to this pod — move them first` });
    }
    await Rotation.deleteMany({ pod: req.params.id });
    const deleted = await Pod.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'unknown pod' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
