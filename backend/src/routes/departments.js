import { Router } from 'express';
import Assessment from '../models/Assessment.js';
import Department from '../models/Department.js';
import Module from '../models/Module.js';
import Rotation from '../models/Rotation.js';
import Trainee from '../models/Trainee.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

function serialize(d) {
  return { code: d.code, name: d.name };
}

// GET /api/departments — the program's current department list (any authenticated
// staff can view — same pattern as pods/rotations, which everyone needs to read
// trainee records and schedules).
router.get('/', async (req, res, next) => {
  try {
    const departments = await Department.find().sort('name').lean();
    res.json(departments.map(serialize));
  } catch (e) {
    next(e);
  }
});

// POST /api/departments — {code, name} — add a new department. Reuses the
// "rotation" permission module (department allotment is a rotation/program-design
// concern per README, owned by the same people who manage the rotation schedule).
router.post('/', requirePermission('rotation', 'create'), async (req, res, next) => {
  try {
    const code = (req.body.code || '').trim().toUpperCase();
    const name = (req.body.name || '').trim();
    if (!code || !name) return res.status(400).json({ error: 'code and name are required' });

    const existing = await Department.findOne({ code });
    if (existing) return res.status(400).json({ error: `department ${code} already exists` });

    const department = await Department.create({ code, name });
    res.status(201).json(serialize(department));
  } catch (e) {
    next(e);
  }
});

// PUT /api/departments/:code — rename a department. The code itself is never
// editable once created — it's what's stored on every Trainee/Module/Rotation/
// Assessment row that references this department, so changing it would silently
// orphan all of them.
router.put('/:code', requirePermission('rotation', 'edit'), async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });

    const department = await Department.findOneAndUpdate(
      { code: req.params.code.toUpperCase() }, { name }, { returnDocument: 'after' });
    if (!department) return res.status(404).json({ error: 'unknown department' });
    res.json(serialize(department));
  } catch (e) {
    next(e);
  }
});

// DELETE /api/departments/:code — refuses if anything still references it, so
// deleting a department never silently orphans trainees/modules/rotations/drill
// marks that are tagged with it.
router.delete('/:code', requirePermission('rotation', 'delete'), async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const [trainees, modules, rotations, assessments] = await Promise.all([
      Trainee.countDocuments({ department: code }),
      Module.countDocuments({ department: code }),
      Rotation.countDocuments({ department: code }),
      Assessment.countDocuments({ department: code }),
    ]);
    const inUse = trainees + modules + rotations + assessments;
    if (inUse > 0) {
      return res.status(400).json({ error: `department ${code} is still in use (${inUse} record(s)) — reassign them first` });
    }
    const deleted = await Department.findOneAndDelete({ code });
    if (!deleted) return res.status(404).json({ error: 'unknown department' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
