const Notification = require('../models/Notification');
async function flushSubject(subject) {
  for (const [collection, kind] of [['announcements', 'announcement'], ['materials', 'material']]) {
    for (const item of subject[collection]) {
      if (!item.notificationPending || item.status !== 'posted') continue;
      const eventKey = `${kind}:${item._id}`;
      const recipients = item.notificationRecipients || [];
      if (recipients.length) await Notification.bulkWrite(recipients.map(recipient => ({ updateOne: {
        filter: { recipient, eventKey },
        update: { $setOnInsert: { recipient, eventKey, kind, title: kind === 'announcement' ? `New announcement · ${subject.code}` : `New material · ${subject.code}`, message: (kind === 'announcement' ? item.content || 'Your teacher shared an attachment or link.' : item.title).slice(0, 240), url: `/student/my-subjects/${subject._id}?tab=${collection === 'materials' ? 'materials' : 'announcements'}#${kind}-${item._id}`, readAt: null } }, upsert: true,
      } })), { ordered: false });
      await subject.constructor.updateOne({ _id: subject._id }, { $set: { [`${collection}.$[item].notificationPending`]: false } }, { arrayFilters: [{ 'item._id': item._id }] });
    }
  }
}
async function retryNotifications() {
  const Subject = require('../models/Subject');
  const pending = Subject.find({ $or: [{ 'announcements.notificationPending': true }, { 'materials.notificationPending': true }] }).cursor();
  for await (const subject of pending) await flushSubject(subject);
}
module.exports = { flushSubject, retryNotifications };
