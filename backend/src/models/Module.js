import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // "M01"
  title: { type: String, required: true },
  department: { type: String, enum: ['SUP', 'QC', 'MEA', 'STR'], required: true },
  handbookSection: String,
  sequence: { type: Number, required: true },
  // LMS-style content gating: null = not yet scheduled, hidden from trainees; once
  // set, a trainee can't see this module (or its videos/notes) until this date, and
  // sees it permanently once the date arrives. Staff always see everything,
  // regardless of releaseDate, for management purposes.
  releaseDate: { type: Date, default: null },
});

export default mongoose.model('Module', moduleSchema);
