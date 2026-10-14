const Subject = require('../models/Subject');
const Submission = require('../models/Submission');

/**
 * Automatically creates a 0-grade submission for students who missed
 * an assignment/quiz deadline when allowLateSubmissions is false.
 *
 * @param {Object} options
 * @param {string|import('mongoose').Types.ObjectId} [options.subjectId] - Optional subject scope
 * @param {string|import('mongoose').Types.ObjectId} [options.studentId] - Optional student scope
 */
async function autoGradeMissedMaterials({ subjectId, studentId } = {}) {
  try {
    const now = new Date();

    const query = {
      materials: {
        $elemMatch: {
          status: 'posted',
          dueAt: { $lt: now, $ne: null },
          allowLateSubmissions: false,
        },
      },
    };
    if (subjectId) {
      query._id = subjectId;
    }
    if (studentId) {
      query.enrolledStudents = studentId;
    }

    const subjects = await Subject.find(query).select('_id enrolledStudents materials').lean();

    for (const subject of subjects) {
      const expiredMaterials = (subject.materials || []).filter(
        (m) =>
          m.status === 'posted' &&
          m.dueAt &&
          new Date(m.dueAt) < now &&
          m.allowLateSubmissions === false
      );

      if (!expiredMaterials.length) continue;

      for (const material of expiredMaterials) {
        // Determine target students
        let assignedStudents = [];
        if (material.recipientStudents && material.recipientStudents.length > 0) {
          assignedStudents = material.recipientStudents.map((id) => String(id._id || id));
        } else {
          assignedStudents = (subject.enrolledStudents || []).map((id) => String(id._id || id));
        }

        if (studentId) {
          assignedStudents = assignedStudents.filter((id) => id === String(studentId));
        }

        if (!assignedStudents.length) continue;

        // Find existing submissions for this material
        const existingSubmissions = await Submission.find({
          subjectId: subject._id,
          materialId: material._id,
          studentId: { $in: assignedStudents },
        }).select('studentId status grade').lean();

        const existingStudentIds = new Set(
          existingSubmissions.map((s) => String(s.studentId))
        );

        const newSubmissions = [];
        for (const targetStudentId of assignedStudents) {
          if (!existingStudentIds.has(targetStudentId)) {
            // Student did not turn in work before deadline and late turn-in is prohibited -> auto 0 grade
            newSubmissions.push({
              subjectId: subject._id,
              materialId: material._id,
              studentId: targetStudentId,
              status: 'graded',
              grade: 0,
              feedback: 'Automated: Deadline passed and late submissions are closed.',
              isLate: true,
              submittedAt: material.dueAt,
              gradedAt: now,
            });
          }
        }

        if (newSubmissions.length > 0) {
          try {
            await Submission.insertMany(newSubmissions, { ordered: false });
          } catch (err) {
            // Ignore duplicate key errors if created concurrently
            if (err.code !== 11000 && (!err.writeErrors || !err.writeErrors.every((e) => e.code === 11000))) {
              console.error('Error auto-grading missed submissions:', err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to run auto-grade check:', error);
  }
}

module.exports = { autoGradeMissedMaterials };
