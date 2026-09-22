import mongoose from 'mongoose';

const traineeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // display id, e.g. "T01"
  person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  pod: { type: mongoose.Schema.Types.ObjectId, ref: 'Pod', required: true },
  buddy: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
  branch: String,
  department: { type: String, enum: ['SUP', 'QC', 'MEA', 'STR'] },
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
