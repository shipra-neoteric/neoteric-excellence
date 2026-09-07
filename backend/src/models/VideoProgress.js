import mongoose from 'mongoose';

const videoProgressSchema = new mongoose.Schema({
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainee', required: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  secondsWatched: { type: Number, default: 0 },
  completedAt: Date, // set once 90% of duration is reached — SPEC.md §5
  // Set the moment the player detects a forward jump in the video (skipping ahead).
  // Once true, completedAt can never be (re)set until staff explicitly resets this
  // record — a trainee has to watch the video straight through to get credit.
  flaggedForSkipping: { type: Boolean, default: false },
});

videoProgressSchema.index({ trainee: 1, video: 1 }, { unique: true });

export default mongoose.model('VideoProgress', videoProgressSchema);
