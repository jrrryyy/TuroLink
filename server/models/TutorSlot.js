const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  start: { type: Date, required: true },
  booked: { type: Boolean, default: false },
}, { timestamps: true });
schema.index({ teacher: 1, start: 1 }, { unique: true });
module.exports = mongoose.model('TutorSlot', schema);
