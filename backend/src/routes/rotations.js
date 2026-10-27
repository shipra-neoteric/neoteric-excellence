import { Router } from 'express';
import Department from '../models/Department.js';
import Pod from '../models/Pod.js';
import Rotation from '../models/Rotation.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

function serialize(rotation, podName) {
  return {
    id: rotation._id.toString(),
    podId: String(rotation.pod),
    pod: podName,
    blockCode: rotation.blockCode,
    department: rotation.department,
    startsOn: rotation.startsOn.toISOString().slice(0, 10),
    endsOn: rotation.endsOn.toISOString().slice(0, 10),
  };
}

// GET /api/rotations — the batch's block schedule (any authenticated staff can view).
router.get('/', async (req, res, next) => {
  try {
    const pods = await Pod.find().lean();
    const podNameById = Object.fromEntries(pods.map((p) => [String(p._id), p.name]));
    const rotations = await Rotation.find({ pod: { $in: pods.map((p) => p._id) } }).sort('startsOn').lean();
    res.json(rotations.map((r) => serialize(r, podNameById[String(r.pod)])));
  } catch (e) {
    next(e);
  }
});

// POST /api/rotations — add a block: which pod is in which department, for what
// dates. Previously the schedule could only ever be seeded once at deploy time
// (db/seed.js), with no way to add to or correct it afterward.
router.post('/', requirePermission('rotation', 'create'), async (req, res, next) => {
  try {
    const { podId, blockCode, department, startsOn, endsOn } = req.body;
    if (!podId || !blockCode || !department || !startsOn || !endsOn) {
      return res.status(400).json({ error: 'podId, blockCode, department, startsOn and endsOn are required' });
    }
    if (!(await Department.findOne({ code: department }))) return res.status(400).json({ error: 'invalid department' });
    if (new Date(startsOn) > new Date(endsOn)) return res.status(400).json({ error: 'startsOn must be before endsOn' });

    const pod = await Pod.findById(podId).lean();
    if (!pod) return res.status(400).json({ error: 'unknown pod' });

    const rotation = await Rotation.create({
      pod: pod._id, blockCode, department, startsOn: new Date(startsOn), endsOn: new Date(endsOn),
    });
    res.status(201).json(serialize(rotation, pod.name));
  } catch (e) {
    next(e);
  }
});

// PUT /api/rotations/:id — reassign a pod to a different department, block or date
// range (the "who's allotted where" editor SPEC.md §7 previously left out).
router.put('/:id', requirePermission('rotation', 'edit'), async (req, res, next) => {
  try {
    const { podId, blockCode, department, startsOn, endsOn } = req.body;
    if (department != null && !(await Department.findOne({ code: department }))) return res.status(400).json({ error: 'invalid department' });

    const existing = await Rotation.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'unknown rotation block' });

    const nextStarts = startsOn != null ? new Date(startsOn) : existing.startsOn;
    const nextEnds = endsOn != null ? new Date(endsOn) : existing.endsOn;
    if (nextStarts > nextEnds) return res.status(400).json({ error: 'startsOn must be before endsOn' });

    if (podId != null) {
      const pod = await Pod.findById(podId);
      if (!pod) return res.status(400).json({ error: 'unknown pod' });
      existing.pod = pod._id;
    }
    if (blockCode != null) existing.blockCode = blockCode;
    if (department != null) existing.department = department;
    existing.startsOn = nextStarts;
    existing.endsOn = nextEnds;
    await existing.save();

    const pod = await Pod.findById(existing.pod).lean();
    res.json(serialize(existing, pod?.name ?? null));
  } catch (e) {
    next(e);
  }
});

// DELETE /api/rotations/:id
router.delete('/:id', requirePermission('rotation', 'delete'), async (req, res, next) => {
  try {
    const deleted = await Rotation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'unknown rotation block' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
