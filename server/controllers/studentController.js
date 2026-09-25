const Booking = require('../models/Booking');
const Subject = require('../models/Subject');
const Submission = require('../models/Submission');
const { upcomingBookings } = require('../services/bookingSummary');

const getDashboardData = async (req, res) => {
  try {
    const user = req.user;

    const now = new Date();
    const local = new Date(+now + 8 * 3600000);
    const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 5 + i, 1)));
    const totals = await Booking.aggregate([
      { $match: { student: user._id, status: 'confirmed', end: { $lte: now, $gte: new Date(+months[0] - 8 * 3600000) } } },
      { $group: { _id: { $dateToString: { date: '$end', format: '%Y-%m', timezone: 'Asia/Manila' } }, hours: { $sum: { $divide: [{ $subtract: ['$end', '$start'] }, 3600000] } } } }
    ]);
    const sessionHours = months.map(month => ({ month: month.toLocaleDateString('en', { month: 'short', timeZone: 'UTC' }), hours: Math.round((totals.find(row => row._id === month.toISOString().slice(0, 7))?.hours || 0) * 10) / 10 }));

    // ── Calculate student assessment performance ────────────────────────────
    const enrolledSubjects = await Subject.find({ enrolledStudents: user._id }).lean();
    const submissions = await Submission.find({ studentId: user._id }).lean();

    const subjectMap = new Map();
    const materialMap = new Map();
    enrolledSubjects.forEach(subject => {
      subjectMap.set(String(subject._id), subject);
      (subject.materials || []).forEach(material => {
        materialMap.set(String(material._id), {
          ...material,
          subjectId: subject._id,
          subjectTitle: subject.title,
          subjectCode: subject.code,
        });
      });
    });

    const gradedAssessments = [];
    submissions.forEach(sub => {
      if (sub.status === 'graded' && sub.grade !== null && sub.grade !== undefined) {
        const mat = materialMap.get(String(sub.materialId));
        if (mat) {
          const maxPoints = Number(mat.points) > 0 ? Number(mat.points) : 100;
          const score = Number(sub.grade);
          const percentage = Math.min(100, Math.max(0, Math.round((score / maxPoints) * 100)));
          gradedAssessments.push({
            id: sub._id,
            materialId: sub.materialId,
            materialTitle: mat.title || 'Assessment',
            type: mat.type || 'assignment',
            subjectId: mat.subjectId,
            subjectTitle: mat.subjectTitle,
            subjectCode: mat.subjectCode,
            score,
            maxPoints,
            percentage,
            feedback: sub.feedback || '',
            gradedAt: sub.gradedAt || sub.updatedAt || sub.submittedAt,
          });
        }
      }
    });

    // Chronological order for trend visualization
    gradedAssessments.sort((a, b) => new Date(a.gradedAt) - new Date(b.gradedAt));

    const overallAverage = gradedAssessments.length
      ? Math.round((gradedAssessments.reduce((sum, a) => sum + a.percentage, 0) / gradedAssessments.length) * 10) / 10
      : null;

    const bySubject = enrolledSubjects.map(subject => {
      const subjectGrades = gradedAssessments.filter(a => String(a.subjectId) === String(subject._id));
      const avg = subjectGrades.length
        ? Math.round((subjectGrades.reduce((sum, a) => sum + a.percentage, 0) / subjectGrades.length) * 10) / 10
        : null;
      return {
        subjectId: subject._id,
        title: subject.title,
        code: subject.code,
        averageScore: avg,
        gradedCount: subjectGrades.length,
        totalMaterials: (subject.materials || []).filter(m => m.status === 'posted').length,
      };
    });

    const history = gradedAssessments.map(a => ({
      id: a.id,
      title: a.materialTitle,
      type: a.type,
      subject: a.subjectCode || a.subjectTitle,
      score: a.score,
      maxPoints: a.maxPoints,
      percentage: a.percentage,
      feedback: a.feedback,
      date: a.gradedAt ? new Date(a.gradedAt).toISOString().split('T')[0] : '',
      formattedDate: a.gradedAt ? new Date(a.gradedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    }));

    const assessmentStats = {
      overallAverage,
      totalGraded: gradedAssessments.length,
      highestScore: gradedAssessments.length ? Math.max(...gradedAssessments.map(a => a.percentage)) : null,
      lowestScore: gradedAssessments.length ? Math.min(...gradedAssessments.map(a => a.percentage)) : null,
      totalSubmitted: submissions.length,
      pendingGrading: submissions.filter(s => s.status === 'submitted').length,
    };

    res.json({
      student: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },

      enrolledCourses: user.enrolledCourses,

      sessionHours,

      upcomingClasses: await upcomingBookings(user._id, 'student'),

      assessments: {
        overallAverage,
        stats: assessmentStats,
        bySubject,
        history,
        recent: [...history].reverse().slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    res.status(500).json({
      message: "Unable to load dashboard.",
    });
  }
};

module.exports = {
  getDashboardData,
};
