const Booking = require('../models/Booking');
const formatTime = (value) => new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
async function upcomingBookings(userId, role) {
  const bookings = await Booking.find({ [role]: userId, end: { $gt: new Date() } }).populate(role === 'student' ? 'teacher' : 'student', 'name').sort({ start: 1 }).lean();
  return bookings.map((booking) => ({
    _id: booking._id, subject: booking.subject,
    time: `${formatTime(booking.start)} – ${new Date(booking.end).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} (Manila)`,
    tutor: booking.teacher?.name || '', students: booking.student ? [booking.student] : [],
  }));
}
module.exports = { upcomingBookings };
