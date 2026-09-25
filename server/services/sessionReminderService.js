const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

async function checkUpcomingSessionReminders() {
  try {
    const now = new Date();
    // Check sessions starting within the next 45 minutes
    const upcomingWindow = new Date(now.getTime() + 45 * 60 * 1000);

    const upcomingBookings = await Booking.find({
      status: 'confirmed',
      start: { $gte: now, $lte: upcomingWindow },
    }).populate('teacher', 'name notificationPreferences role')
      .populate('student', 'name notificationPreferences role')
      .lean();

    for (const booking of upcomingBookings) {
      const minutesLeft = Math.max(1, Math.round((new Date(booking.start).getTime() - now.getTime()) / 60000));
      const formattedTime = new Date(booking.start).toLocaleTimeString('en-PH', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      // Teacher reminder
      if (booking.teacher && booking.teacher.notificationPreferences?.sessionReminders !== false) {
        try {
          await Notification.create({
            recipient: booking.teacher._id,
            eventKey: `session-reminder:${booking._id}`,
            kind: 'session',
            sourceId: booking._id,
            title: `Session Reminder · ${booking.subject}`,
            message: `Your tutoring session with ${booking.student?.name || 'student'} starts in ~${minutesLeft} mins at ${formattedTime}.`,
            url: '/teacher/schedules',
          });
        } catch (err) {
          if (err.code !== 11000) console.error('Teacher reminder error:', err.name);
        }
      }

      // Student reminder
      if (booking.student && booking.student.notificationPreferences?.sessionReminders !== false) {
        try {
          await Notification.create({
            recipient: booking.student._id,
            eventKey: `session-reminder:${booking._id}`,
            kind: 'session',
            sourceId: booking._id,
            title: `Session Reminder · ${booking.subject}`,
            message: `Your tutoring session with ${booking.teacher?.name || 'teacher'} starts in ~${minutesLeft} mins at ${formattedTime}.`,
            url: '/student/schedules',
          });
        } catch (err) {
          if (err.code !== 11000) console.error('Student reminder error:', err.name);
        }
      }
    }
  } catch (error) {
    console.error('Session reminder check failed:', error.name);
  }
}

module.exports = { checkUpcomingSessionReminders };
