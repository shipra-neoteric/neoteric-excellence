import { Router } from 'express';
import Settings from '../models/Settings.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

async function getSingleton() {
  let doc = await Settings.findOne();
  if (!doc) doc = await Settings.create({});
  return doc;
}

// GET /api/settings — any authenticated user (staff or trainee) can read these; the
// trainee shell needs to know whether to show the Checklist tab at all.
router.get('/', async (req, res, next) => {
  try {
    const doc = await getSingleton();
    res.json({ traineeChecklistEnabled: doc.traineeChecklistEnabled });
  } catch (e) {
    next(e);
  }
});

// PUT /api/settings — admin only.
router.put('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { traineeChecklistEnabled } = req.body;
    const update = {};
    if (traineeChecklistEnabled != null) update.traineeChecklistEnabled = !!traineeChecklistEnabled;

    const doc = await Settings.findOneAndUpdate({}, update, { upsert: true, new: true });
    res.json({ traineeChecklistEnabled: doc.traineeChecklistEnabled });
  } catch (e) {
    next(e);
  }
});

export default router;
