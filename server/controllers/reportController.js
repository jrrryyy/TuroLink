const mongoose = require('mongoose');
const Report = require('../models/Report');
const User = require('../models/User');

const VALID_CATEGORIES = [
  'fraud',
  'fake_profile',
  'harassment',
  'scam',
  'inappropriate_content',
  'other',
];

/**
 * POST /api/reports
 * Submit a complaint against a user (students and teachers)
 */
async function createReport(req, res) {
  try {
    const reporterId = req.user._id;
    const { reportedUserId, category, reason = '', description } = req.body || {};

    if (!reportedUserId || !mongoose.isValidObjectId(reportedUserId)) {
      return res.status(400).json({ message: 'Invalid or missing user ID to report.' });
    }

    if (String(reporterId) === String(reportedUserId)) {
      return res.status(400).json({ message: 'You cannot submit a report against yourself.' });
    }

    const reportedUser = await User.findById(reportedUserId).select('_id name role isBanned');
    if (!reportedUser) {
      return res.status(404).json({ message: 'Reported user does not exist.' });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: 'Please select a valid report reason category.',
        validCategories: VALID_CATEGORIES,
      });
    }

    const cleanDescription = (description || '').trim();
    if (!cleanDescription || cleanDescription.length < 5) {
      return res.status(400).json({
        message: 'Please provide a clear description of the issue (at least 5 characters).',
      });
    }

    if (cleanDescription.length > 3000) {
      return res.status(400).json({
        message: 'Description must not exceed 3,000 characters.',
      });
    }

    const report = await Report.create({
      reporter: reporterId,
      reportedUser: reportedUserId,
      category,
      reason: (reason || '').trim().slice(0, 200),
      description: cleanDescription,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Your report has been submitted to administration for review. Thank you for keeping TuroLink safe.',
      reportId: report._id,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: 'Unable to submit report. Please try again.' });
  }
}

/**
 * GET /api/reports/mine
 * View reports submitted by the logged-in user
 */
async function getMyReports(req, res) {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .populate('reportedUser', 'name role profilePicture')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ reports });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ message: 'Unable to load your submitted reports.' });
  }
}

module.exports = {
  createReport,
  getMyReports,
};
