const mongoose = require('mongoose');
module.exports = mongoose.model('AuthChallenge', new mongoose.Schema({
  tokenHash: { type: String, unique: true, required: true },
  kind: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, required: true, expires: 0 },
}));
