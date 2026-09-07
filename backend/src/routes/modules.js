import { v2 as cloudinary } from 'cloudinary';
import { Router } from 'express';
import Module from '../models/Module.js';
import ModuleNote from '../models/ModuleNote.js';
import Video from '../models/Video.js';
import VideoProgress from '../models/VideoProgress.js';
import { requirePermission, requireRole } from '../middleware/auth.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DEPARTMENTS = ['SUP', 'QC', 'MEA', 'STR'];

const router = Router();

// GET /api/modules?with=videos — everyone except Bharti (SPEC.md §4: "Watch module
// videos | ✓ | ✓ | ✓ | ✓ |" — trainee, buddy, coordinator, supervisor). Trainees only
// see modules that have actually been scheduled and whose date has arrived — an
// unscheduled module (releaseDate not set) stays hidden, it does NOT default to
// visible, otherwise every module goes out to every trainee on day one the moment
// it's created, before staff ever pace the curriculum. Once released, a module never
// gets hidden again (no $lte upper bound). Staff see everything regardless, since
// they manage it.
router.get('/', requireRole('trainee', 'buddy', 'coordinator', 'supervisor', 'admin'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'trainee'
      ? { releaseDate: { $ne: null, $lte: new Date() } }
      : {};
    const modules = await Module.find(filter).sort('sequence').lean();
    if (req.query.with !== 'videos') return res.json(modules);

    const moduleIds = modules.map((m) => m._id);
    const [videos, notes] = await Promise.all([
      Video.find({ module: { $in: moduleIds }, status: { $ne: 'retired' } }).lean(),
      ModuleNote.find({ module: { $in: moduleIds } }).sort('-createdAt').lean(),
    ]);
    const videosByModule = {};
    videos.forEach((v) => { (videosByModule[String(v.module)] ??= []).push(v); });
    const notesByModule = {};
    notes.forEach((n) => { (notesByModule[String(n.module)] ??= []).push(n); });

    res.json(modules.map((m) => ({
      ...m,
      videos: videosByModule[String(m._id)] ?? [],
      notes: notesByModule[String(m._id)] ?? [],
    })));
  } catch (e) {
    next(e);
  }
});

// POST /api/modules — create a new module. There was previously no way to add one
// short of seeding the DB directly.
router.post('/', requirePermission('content', 'create'), async (req, res, next) => {
  try {
    const { code, title, department, sequence, releaseDate } = req.body;
    if (!code || !title || !department || sequence == null) {
      return res.status(400).json({ error: 'code, title, department and sequence are required' });
    }
    if (!DEPARTMENTS.includes(department)) return res.status(400).json({ error: 'invalid department' });
    if (await Module.findOne({ code })) return res.status(400).json({ error: `a module with code ${code} already exists` });

    const mod = await Module.create({
      code, title, department, sequence: Number(sequence),
      releaseDate: releaseDate ? new Date(releaseDate) : null,
    });
    res.status(201).json(mod);
  } catch (e) {
    next(e);
  }
});

// POST /api/modules/:id/notes — {title, dataUrl, fileName, fileType} — a file
// attachment (PDF/DOC/image) alongside a module's videos. `dataUrl` is a base64 data
// URL uploaded straight to Cloudinary, same no-multer pattern as checklist evidence
// photos (checklist.js). resource_type 'auto' so images/PDFs land as Cloudinary
// "image" resources and DOC/DOCX land as "raw".
// Registered ahead of the generic /:id routes below on purpose.
router.post('/:id/notes', requirePermission('content', 'create'), async (req, res, next) => {
  try {
    const { title, dataUrl, fileName, fileType } = req.body;
    if (!title || !dataUrl) return res.status(400).json({ error: 'title and a file are required' });
    const mod = await Module.findById(req.params.id);
    if (!mod) return res.status(404).json({ error: 'unknown module' });

    const upload = await cloudinary.uploader.upload(dataUrl, {
      folder: `neev/module-notes/${mod.code}`,
      resource_type: 'auto',
    });
    const note = await ModuleNote.create({
      module: mod._id, title, fileUrl: upload.secure_url, fileName, fileType, addedBy: req.user.name,
    });
    res.status(201).json(note);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/modules/notes/:id — must stay ahead of DELETE /:id, or "notes" would be
// matched as a module id.
router.delete('/notes/:id', requirePermission('content', 'delete'), async (req, res, next) => {
  try {
    const deleted = await ModuleNote.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'unknown note' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// PUT /api/modules/:id — edit (mainly releaseDate, for content scheduling)
router.put('/:id', requirePermission('content', 'edit'), async (req, res, next) => {
  try {
    const { title, department, sequence, releaseDate } = req.body;
    const update = {};
    if (title != null) update.title = title;
    if (department != null) update.department = department;
    if (sequence != null) update.sequence = sequence;
    if (releaseDate !== undefined) update.releaseDate = releaseDate ? new Date(releaseDate) : null;

    const mod = await Module.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!mod) return res.status(404).json({ error: 'unknown module' });
    res.json(mod);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/modules/:id — cascades its videos, notes and video-progress records
router.delete('/:id', requirePermission('content', 'delete'), async (req, res, next) => {
  try {
    const videos = await Video.find({ module: req.params.id }).select('_id').lean();
    await Promise.all([
      VideoProgress.deleteMany({ video: { $in: videos.map((v) => v._id) } }),
      Video.deleteMany({ module: req.params.id }),
      ModuleNote.deleteMany({ module: req.params.id }),
    ]);
    const deleted = await Module.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'unknown module' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
