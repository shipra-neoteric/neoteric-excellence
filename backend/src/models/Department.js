import mongoose from 'mongoose';

// Departments used to be a fixed 4-value enum (SUP/QC/MEA/STR) baked into every model
// that referenced one — Trainee, Rotation, Module, Assessment. That assumed every
// batch runs the same Civil-trade program forever. This collection makes the list
// itself data, so admins can add/rename/remove departments (e.g. for a different
// trade) without a code change. `code` is the short value stored on those other
// documents; `name` is what's shown in the UI.
const departmentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
});

export default mongoose.model('Department', departmentSchema);
