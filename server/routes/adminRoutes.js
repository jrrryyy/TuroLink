const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

// All admin routes strictly require authentication and admin role
router.use(protect, requireAdmin);

// Platform Analytics & Metrics
router.get('/stats', adminController.getStats);

// User Management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/role', adminController.updateUserRole);
router.patch('/users/:id/verify', adminController.toggleUserVerification);
router.delete('/users/:id', adminController.deleteUser);

// Teacher Verifications
router.get('/teachers', adminController.getTeachers);
router.patch('/teachers/:id/verify', adminController.verifyTeacher);

// Subjects & Course Management
router.get('/subjects', adminController.getSubjects);
router.delete('/subjects/:id', adminController.deleteSubject);

// Bookings & Schedules Oversight
router.get('/bookings', adminController.getBookings);
router.patch('/bookings/:id/status', adminController.updateBookingStatus);

module.exports = router;
