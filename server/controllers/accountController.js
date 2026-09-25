const User = require('../models/User');
const bcrypt = require('bcryptjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const directory = path.resolve(__dirname, '../uploads/avatars');

const defaultNotificationPreferences = {
  emailNotifications: true,
  sessionReminders: true,
  newMessageAlerts: true,
  pushNotifications: false,
};

const publicUser = (user) => ({
  emailVerified: Boolean(user.emailVerifiedAt),
  hasPassword: Boolean(user.password),
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  bio: user.bio || '',
  sex: user.sex || '',
  profilePicture: user.profilePicture || '',
  notificationPreferences: user.notificationPreferences ? {
    emailNotifications: user.notificationPreferences.emailNotifications ?? true,
    sessionReminders: user.notificationPreferences.sessionReminders ?? true,
    newMessageAlerts: user.notificationPreferences.newMessageAlerts ?? true,
    pushNotifications: user.notificationPreferences.pushNotifications ?? false,
  } : defaultNotificationPreferences,
});
async function removePicture(url) {
  if (!/^\/uploads\/avatars\/[a-f0-9-]+\.(png|jpg|webp)$/.test(url || '')) return;
  await fs.unlink(path.join(directory, path.basename(url))).catch(() => {});
}

const updateAccount = async (req, res) => {
  let uploaded;
  try {
    const { validateProfile } = await import('../../shared/validation.mjs');
    const errors = validateProfile(req.body || {});
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ message: 'Please sign in again.' });
    const changes = { name: req.body.name.trim(), bio: (req.body.bio || '').trim(), sex: req.body.sex || '' };
    const passwordChange = Boolean(req.body.currentPassword || req.body.newPassword || req.body.confirmPassword);
    if (passwordChange) {
      if (!user.password || !await bcrypt.compare(req.body.currentPassword, user.password)) return res.status(400).json({ message: 'Current password is incorrect.', errors: { currentPassword: 'Current password is incorrect.' } });
      changes.password = await bcrypt.hash(req.body.newPassword, 10);
    }
    if (req.file) {
      const buffer = req.file.buffer;
      let extension;
      if (req.file.mimetype === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension = 'png';
      if (req.file.mimetype === 'image/jpeg' && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) extension = 'jpg';
      if (req.file.mimetype === 'image/webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') extension = 'webp';
      if (!extension) return res.status(400).json({ message: 'Choose a JPG, PNG, or WebP image.', errors: { profilePicture: 'Choose a valid JPG, PNG, or WebP image.' } });
      await fs.mkdir(directory, { recursive: true });
      uploaded = `/uploads/avatars/${randomUUID()}.${extension}`;
      await fs.writeFile(path.join(directory, path.basename(uploaded)), buffer);
      changes.profilePicture = uploaded;
    } else if (req.body.removePicture === 'true') changes.profilePicture = '';
    const updated = await User.findOneAndUpdate({ _id: user._id, password: user.password }, { $set: changes }, { returnDocument: 'after', runValidators: true });
    if (!updated) {
      await removePicture(uploaded);
      return res.status(409).json({ message: 'Your account changed during this request. Reload and try again.' });
    }
    if (passwordChange) await require('../models/AuthSession').deleteMany({ user: user._id, _id: { $ne: req.authSession._id } });
    if ('profilePicture' in changes) await removePicture(user.profilePicture);
    res.json({ message: 'Changes saved successfully.', user: publicUser(updated) });
  } catch (error) {
    await removePicture(uploaded);
    console.error('Account update failed:', error.name);
    res.status(500).json({ message: 'Unable to save changes. Please try again.' });
  }
};
module.exports = { updateAccount, publicUser };
