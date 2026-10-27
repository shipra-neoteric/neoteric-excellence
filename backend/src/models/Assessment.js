import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema({
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainee', required: true },
  kind: {
    type: String,
    enum: ['baseline', 'checkpoint', 'drill', 'capstone', 'gateway'],
    required: true,
  },
  // only set for kind: 'drill' — one drill mark per department per trainee.
  // References Department.code — see Trainee.js for why this isn't a fixed enum.
  department: { type: String, default: null },
  written: Number,
  practical: Number,
  behavioural: Number,
  total: Number, // written + practical + behavioural, set on save
  assessedBy: String,
  assessedAt: { type: Date, default: Date.now },
});

assessmentSchema.index({ trainee: 1, kind: 1, department: 1 }, { unique: true });

assessmentSchema.pre('save', function computeTotal(next) {
  if (this.written != null && this.practical != null && this.behavioural != null) {
    this.total = this.written + this.practical + this.behavioural;
  }
  next();
});

export default mongoose.model('Assessment', assessmentSchema);
