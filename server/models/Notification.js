const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventKey: { type: String, required: true },
  kind: { type: String, enum: ['announcement', 'material', 'session'], required: true },
  title: String,
  message: String,
  url: String,
  readAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ recipient: 1, eventKey: 1 }, { unique: true });
schema.index({ recipient: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', schema);
