import mongoose from 'mongoose';

// A single global settings document (only one ever exists) for feature toggles staff
// need to flip without a code change/redeploy — e.g. temporarily hiding the trainee
// checklist while it isn't ready for use yet.
const settingsSchema = new mongoose.Schema({
  traineeChecklistEnabled: { type: Boolean, default: true },
});

export default mongoose.model('Settings', settingsSchema);
