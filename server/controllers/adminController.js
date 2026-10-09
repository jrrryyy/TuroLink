const User = require('../models/User');
const TeacherProfile = require('../models/TeacherProfile');
const Subject = require('../models/Subject');
const Booking = require('../models/Booking');
const Session = require('../models/AuthSession');
const Report = require('../models/Report');

// ── GET /api/admin/stats ──────────────────────────────────────────────────
async function getStats(req, res) {
  try {
    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      verifiedUsers,
      totalSubjects,
      totalBookings,
      pendingReportsCount,
      recentUsers,
      recentBookings,
      pendingTeachers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ emailVerifiedAt: { $ne: null } }),
      Subject.countDocuments(),
      Booking.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('name email role profilePicture isBanned emailVerifiedAt createdAt')
        .lean(),
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('student', 'name email')
        .populate('teacher', 'name email')
        .lean(),
      TeacherProfile.find({ isVerified: { $ne: true } })
        .populate('user', 'name email profilePicture role')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Only count and return actual teacher users who exist
    const validPendingTeachers = pendingTeachers.filter((tp) => tp.user && tp.user.role === 'teacher');
    const activeSessions = await Session.countDocuments({ expiresAt: { $gt: new Date() } });

    res.json({
      metrics: {
        totalUsers,
        totalStudents,
        totalTeachers,
        totalAdmins,
        verifiedUsers,
        totalSubjects,
        totalBookings,
        activeSessions,
        pendingVerifications: validPendingTeachers.length,
        pendingReports: pendingReportsCount,
      },
      recentUsers,
      recentBookings,
      pendingTeachers: validPendingTeachers.slice(0, 6),
    });
  } catch (error) {
    console.error('Admin getStats error:', error);
    res.status(500).json({ message: 'Unable to load platform statistics.' });
  }
}

// ── GET /api/admin/users ──────────────────────────────────────────────────
async function getUsers(req, res) {
  try {
    const { search = '', role = 'all', status = 'all', page = 1, limit = 25 } = req.query;
    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status === 'verified') {
      query.emailVerifiedAt = { $ne: null };
    } else if (status === 'unverified') {
      query.emailVerifiedAt = null;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .select('name email phone role profilePicture emailVerifiedAt isBanned bannedAt bannedReason createdAt updatedAt')
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / take) || 1,
    });
  } catch (error) {
    console.error('Admin getUsers error:', error);
    res.status(500).json({ message: 'Unable to retrieve users.' });
  }
}

// ── PATCH /api/admin/users/:id/role ───────────────────────────────────────
async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Protect current super-admin from demoting themselves by accident if needed
    if (user._id.toString() === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot demote your own administrator account.' });
    }

    user.role = role;
    await user.save();

    // If promoted to teacher and lacks profile, create baseline profile
    if (role === 'teacher') {
      const existingProfile = await TeacherProfile.findOne({ user: user._id });
      if (!existingProfile) {
        await TeacherProfile.create({
          user: user._id,
          degreeTitle: 'Instructor',
          subjectToTeach: 'General Education',
          teachingBio: user.bio || 'TuroLink verified teacher.',
          isVerified: true,
        });
      }
    }

    res.json({
      message: `User role updated to ${role}.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Admin updateUserRole error:', error);
    res.status(500).json({ message: 'Unable to update user role.' });
  }
}

// ── PATCH /api/admin/users/:id/verify ─────────────────────────────────────
async function toggleUserVerification(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.emailVerifiedAt = user.emailVerifiedAt ? null : new Date();
    await user.save();

    res.json({
      message: user.emailVerifiedAt ? 'User marked as email-verified.' : 'User marked as unverified.',
      verified: Boolean(user.emailVerifiedAt),
    });
  } catch (error) {
    console.error('Admin toggleUserVerification error:', error);
    res.status(500).json({ message: 'Unable to toggle user verification.' });
  }
}

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own active administrator account.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Clean up associated sessions, teacher profiles, subjects
    await Session.deleteMany({ user: id });
    await TeacherProfile.deleteMany({ user: id });
    await User.findByIdAndDelete(id);

    res.json({ message: 'User and active sessions deleted successfully.' });
  } catch (error) {
    console.error('Admin deleteUser error:', error);
    res.status(500).json({ message: 'Unable to delete user.' });
  }
}

// ── GET /api/admin/teachers ───────────────────────────────────────────────
async function getTeachers(req, res) {
  try {
    const { status = 'all' } = req.query;

    // Proactively clean up any orphaned profiles whose user was deleted
    const allProfiles = await TeacherProfile.find().select('_id user').lean();
    const userIds = allProfiles.map((p) => p.user);
    const existingUsers = await User.find({ _id: { $in: userIds } }).select('_id role').lean();
    const existingUserMap = new Map(existingUsers.map((u) => [String(u._id), u]));

    const orphanedIds = [];
    for (const p of allProfiles) {
      const u = existingUserMap.get(String(p.user));
      if (!u) {
        orphanedIds.push(p._id);
      }
    }
    if (orphanedIds.length > 0) {
      await TeacherProfile.deleteMany({ _id: { $in: orphanedIds } });
    }

    const query = {};
    if (status === 'verified') {
      query.isVerified = true;
    } else if (status === 'pending') {
      query.isVerified = { $ne: true };
    }

    const profiles = await TeacherProfile.find(query)
      .populate('user', 'name email phone role profilePicture emailVerifiedAt createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Filter to only genuine teacher user accounts (exclude deleted/null users and admins)
    const validProfiles = profiles.filter((p) => p.user && p.user.role === 'teacher');

    res.json({ profiles: validProfiles });
  } catch (error) {
    console.error('Admin getTeachers error:', error);
    res.status(500).json({ message: 'Unable to retrieve teacher profiles.' });
  }
}

// ── PATCH /api/admin/teachers/:id/verify ──────────────────────────────────
async function verifyTeacher(req, res) {
  try {
    const { id } = req.params;
    const { isVerified = true } = req.body;

    const profile = await TeacherProfile.findById(id).populate('user', 'name email role');
    if (!profile) return res.status(404).json({ message: 'Teacher profile not found.' });

    profile.isVerified = Boolean(isVerified);
    profile.verificationReviewedAt = new Date();
    await profile.save();

    res.json({
      message: profile.isVerified ? 'Teacher application approved and verified.' : 'Teacher verification rejected.',
      profile,
    });
  } catch (error) {
    console.error('Admin verifyTeacher error:', error);
    res.status(500).json({ message: 'Unable to verify teacher profile.' });
  }
}

// ── GET /api/admin/subjects ───────────────────────────────────────────────
async function getSubjects(req, res) {
  try {
    const subjects = await Subject.find()
      .populate('teacherId', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = subjects.map((s) => ({
      _id: s._id,
      title: s.title,
      code: s.code,
      description: s.description,
      gradeLevel: s.gradeLevel,
      teacher: s.teacherId,
      studentCount: (s.enrolledStudents || []).length,
      announcementCount: (s.announcements || []).length,
      materialCount: (s.materials || []).length,
      createdAt: s.createdAt,
    }));

    res.json({ subjects: formatted });
  } catch (error) {
    console.error('Admin getSubjects error:', error);
    res.status(500).json({ message: 'Unable to retrieve subjects.' });
  }
}

// ── DELETE /api/admin/subjects/:id ────────────────────────────────────────
async function deleteSubject(req, res) {
  try {
    const { id } = req.params;
    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });

    res.json({ message: 'Subject and course materials removed successfully.' });
  } catch (error) {
    console.error('Admin deleteSubject error:', error);
    res.status(500).json({ message: 'Unable to delete subject.' });
  }
}

// ── GET /api/admin/bookings ───────────────────────────────────────────────
async function getBookings(req, res) {
  try {
    const bookings = await Booking.find()
      .populate('student', 'name email profilePicture')
      .populate('teacher', 'name email profilePicture')
      .sort({ start: -1 })
      .lean();

    res.json({ bookings });
  } catch (error) {
    console.error('Admin getBookings error:', error);
    res.status(500).json({ message: 'Unable to retrieve bookings.' });
  }
}

// ── PATCH /api/admin/bookings/:id/status ──────────────────────────────────
async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid booking status.' });
    }

    const booking = await Booking.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    res.json({ message: `Booking status updated to ${status}.`, booking });
  } catch (error) {
    console.error('Admin updateBookingStatus error:', error);
    res.status(500).json({ message: 'Unable to update booking status.' });
  }
}

// ── GET /api/admin/reports ────────────────────────────────────────────────
async function getReports(req, res) {
  try {
    const { status = 'all', category = 'all', search = '', page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      const matchingUsers = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select('_id');
      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { reason: regex },
        { description: regex },
        { reporter: { $in: userIds } },
        { reportedUser: { $in: userIds } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [reports, total, pendingCount] = await Promise.all([
      Report.find(query)
        .populate('reporter', 'name email role profilePicture phone')
        .populate('reportedUser', 'name email role profilePicture isBanned bannedAt bannedReason phone')
        .populate('resolvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .lean(),
      Report.countDocuments(query),
      Report.countDocuments({ status: 'pending' }),
    ]);

    res.json({
      reports,
      total,
      pendingCount,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / take) || 1,
    });
  } catch (error) {
    console.error('Admin getReports error:', error);
    res.status(500).json({ message: 'Unable to retrieve reports.' });
  }
}

// ── GET /api/admin/reports/stats ──────────────────────────────────────────
async function getReportStats(req, res) {
  try {
    const [total, pending, investigating, resolved, dismissed, bannedCount] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'investigating' }),
      Report.countDocuments({ status: 'resolved' }),
      Report.countDocuments({ status: 'dismissed' }),
      User.countDocuments({ isBanned: true }),
    ]);

    res.json({
      total,
      pending,
      investigating,
      resolved,
      dismissed,
      bannedCount,
    });
  } catch (error) {
    console.error('Admin getReportStats error:', error);
    res.status(500).json({ message: 'Unable to retrieve report statistics.' });
  }
}

// ── PATCH /api/admin/reports/:id ──────────────────────────────────────────
async function updateReport(req, res) {
  try {
    const { id } = req.params;
    const { status, adminNotes, actionTaken } = req.body || {};

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    if (status && ['pending', 'investigating', 'resolved', 'dismissed'].includes(status)) {
      report.status = status;
      if (['resolved', 'dismissed'].includes(status)) {
        report.resolvedAt = new Date();
        report.resolvedBy = req.user._id;
      }
    }

    if (adminNotes !== undefined) {
      report.adminNotes = String(adminNotes).trim();
    }

    if (actionTaken && ['none', 'banned', 'warned', 'dismissed'].includes(actionTaken)) {
      report.actionTaken = actionTaken;
    }

    await report.save();

    const populated = await Report.findById(id)
      .populate('reporter', 'name email role profilePicture phone')
      .populate('reportedUser', 'name email role profilePicture isBanned bannedAt bannedReason phone')
      .populate('resolvedBy', 'name email')
      .lean();

    res.json({ message: 'Report updated successfully.', report: populated });
  } catch (error) {
    console.error('Admin updateReport error:', error);
    res.status(500).json({ message: 'Unable to update report.' });
  }
}

// ── POST /api/admin/users/:id/ban ─────────────────────────────────────────
async function banUser(req, res) {
  try {
    const { id } = req.params;
    const { reason = 'Violation of platform terms and conditions.', reportId } = req.body || {};

    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot ban your own administrator account.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.isBanned = true;
    user.bannedAt = new Date();
    user.bannedReason = String(reason).trim() || 'Account permanently suspended by administration.';
    await user.save();

    // Immediately terminate all active sessions to force logout
    await Session.deleteMany({ user: id });

    // Mark related reports as resolved with 'banned' action
    const updateReportsFilter = reportId ? { _id: reportId } : { reportedUser: id, status: { $in: ['pending', 'investigating'] } };
    await Report.updateMany(updateReportsFilter, {
      $set: {
        status: 'resolved',
        actionTaken: 'banned',
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
        adminNotes: `Banned for life by admin. Reason: ${user.bannedReason}`,
      },
    });

    res.json({
      message: `${user.name} has been banned for life and all active sessions were terminated.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isBanned: user.isBanned,
        bannedAt: user.bannedAt,
        bannedReason: user.bannedReason,
      },
    });
  } catch (error) {
    console.error('Admin banUser error:', error);
    res.status(500).json({ message: 'Unable to ban user.' });
  }
}

// ── POST /api/admin/users/:id/unban ───────────────────────────────────────
async function unbanUser(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.isBanned = false;
    user.bannedAt = null;
    user.bannedReason = '';
    await user.save();

    res.json({
      message: `${user.name}'s lifetime suspension has been lifted.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isBanned: false,
      },
    });
  } catch (error) {
    console.error('Admin unbanUser error:', error);
    res.status(500).json({ message: 'Unable to unban user.' });
  }
}

module.exports = {
  getStats,
  getUsers,
  updateUserRole,
  toggleUserVerification,
  deleteUser,
  getTeachers,
  verifyTeacher,
  getSubjects,
  deleteSubject,
  getBookings,
  updateBookingStatus,
  getReports,
  getReportStats,
  updateReport,
  banUser,
  unbanUser,
};
