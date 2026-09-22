const mongoose = require('mongoose');
// Keep declined requests as history without retaining Booking's unique time locks.
const schema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slot: mongoose.Schema.Types.ObjectId,
  start: Date,
  end: Date,
  subject: String,
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  price: Number,
  status: { type: String, default: 'declined', enum: ['declined'] },
  requestedAt: Date,
}, { timestamps: true });
schema.index({ teacher: 1, start: 1 });
schema.index({ student: 1, start: 1 });
module.exports = mongoose.model('DeclinedRequest', schema);
