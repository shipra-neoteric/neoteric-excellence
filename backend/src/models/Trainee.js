import mongoose from 'mongoose';

const traineeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // display id, e.g. "T01"
  person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  pod: { type: mongoose.Schema.Types.ObjectId, ref: 'Pod', required: true },
  buddy: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
  branch: String,
  // Free-text code referencing Department.code (backend/src/models/Department.js) —
  // no longer a fixed enum, since the department list itself is admin-editable now.
  department: String,
  baseLocation: String,
  joiningDate: Date,
  baselineScore: { type: Number, min: 0, max: 100 }, // write-once — SPEC.md §8
  status: {
    type: String,
    enum: ['active', 'exited', 'gateway_passed', 'confirmed'],
    default: 'active',
  },
});

export default mongoose.model('Trainee', traineeSchema);
