import mongoose from 'mongoose';

const rotationSchema = new mongoose.Schema({
  pod: { type: mongoose.Schema.Types.ObjectId, ref: 'Pod', required: true },
  blockCode: { type: String, required: true }, // "B1" (taster) or "Month 2" (immersion)
  // References Department.code — see Trainee.js for why this isn't a fixed enum.
  department: { type: String, required: true },
  startsOn: { type: Date, required: true },
  endsOn: { type: Date, required: true },
});

export default mongoose.model('Rotation', rotationSchema);
