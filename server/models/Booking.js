const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'TutorSlot', required: true, unique: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  subject: { type: String, required: true },
  price: { type: Number, required: true },
  review: {
    rating: { type: Number, min: 1, max: 5 },
    text: { type: String, maxlength: 1000 },
    createdAt: Date,
  },
}, { timestamps: true });
// All sessions start on the hour and last exactly one hour.
schema.index({ teacher: 1, start: 1 }, { unique: true });
schema.index({ student: 1, start: 1 }, { unique: true });
module.exports = mongoose.model('Booking', schema);
