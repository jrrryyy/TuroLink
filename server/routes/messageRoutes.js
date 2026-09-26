const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');

const { protect } = require('../middleware/authMiddleware');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Subject = require('../models/Subject');
const TeacherProfile = require('../models/TeacherProfile');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'messages');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message: err.code === 'LIMIT_FILE_SIZE' ? 'Attachment must be 10 MB or smaller.' : 'Upload failed.',
      });
    }
    next();
  });
};

router.use(protect);

// ── GET /conversations ────────────────────────────────────────────────────────
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      deletedFor: { $ne: req.user._id },
    })
      .populate('participants', 'name email role profilePicture')
      .sort({ lastMessageAt: -1 })
      .lean();

    const formatted = conversations.map((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p._id.toString() !== req.user._id.toString()
      ) || null;

      const unreadCount = conv.unreadCounts ? (conv.unreadCounts[req.user._id.toString()] || 0) : 0;

      return {
        _id: conv._id,
        otherParticipant,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        updatedAt: conv.updatedAt,
      };
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load conversations.' });
  }
});

// ── POST /conversations (Find or create conversation with recipient) ─────────
router.post('/conversations', async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId || !mongoose.isValidObjectId(recipientId)) {
      return res.status(400).json({ message: 'Valid recipient ID is required.' });
    }

    if (recipientId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot start a conversation with yourself.' });
    }

    const recipient = await User.findById(recipientId).select('name email role profilePicture').lean();
    if (!recipient) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId], $size: 2 },
    }).populate('participants', 'name email role profilePicture');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId],
        lastMessage: '',
        lastMessageAt: new Date(),
        unreadCounts: {},
      });
      await conversation.populate('participants', 'name email role profilePicture');
    } else if (conversation.deletedFor && conversation.deletedFor.length > 0) {
      conversation.deletedFor = conversation.deletedFor.filter(
        (uid) => uid.toString() !== req.user._id.toString()
      );
      await conversation.save();
    }

    const otherParticipant = conversation.participants.find(
      (p) => p._id.toString() !== req.user._id.toString()
    ) || recipient;

    res.json({
      _id: conversation._id,
      otherParticipant,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to start conversation.' });
  }
});

// ── GET /conversations/:id (Messages history & mark as read) ──────────────────
router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid conversation ID.' });
    }

    const conversation = await Conversation.findById(id).populate('participants', 'name email role profilePicture');
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const messages = await Message.find({ conversationId: id })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: 1 })
      .lean();

    // Mark unread messages as read
    await Message.updateMany(
      { conversationId: id, recipient: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    // Also mark any message notifications for this conversation as read
    await Notification.updateMany(
      { recipient: req.user._id, kind: 'message', sourceId: id, readAt: null },
      { $set: { readAt: new Date() } }
    ).catch(() => {});

    // Reset unread count for current user
    if (conversation.unreadCounts) {
      conversation.set(`unreadCounts.${req.user._id.toString()}`, 0);
      await conversation.save();
    }

    const otherParticipant = conversation.participants.find(
      (p) => p._id.toString() !== req.user._id.toString()
    );

    const currentUser = await User.findById(req.user._id).select('blockedUsers').lean();
    const otherUserId = otherParticipant?._id;
    const otherUser = otherUserId ? await User.findById(otherUserId).select('blockedUsers').lean() : null;

    const isBlockedByMe = Boolean(
      currentUser?.blockedUsers?.some((b) => b.toString() === otherUserId?.toString())
    );
    const isBlockedByThem = Boolean(
      otherUser?.blockedUsers?.some((b) => b.toString() === req.user._id.toString())
    );

    res.json({
      conversation: {
        _id: conversation._id,
        otherParticipant,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        isBlockedByMe,
        isBlockedByThem,
      },
      messages,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load messages.' });
  }
});

// ── POST /conversations/:id (Send message) ────────────────────────────────────
router.post('/conversations/:id', uploadMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid conversation ID.' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const recipientId = conversation.participants.find(
      (p) => p.toString() !== req.user._id.toString()
    );

    // Verify neither user has blocked the other
    const currentUser = await User.findById(req.user._id).select('blockedUsers').lean();
    const recipientUser = await User.findById(recipientId).select('role notificationPreferences blockedUsers').lean();

    const blockedByMe = currentUser?.blockedUsers?.some((b) => b.toString() === recipientId.toString());
    if (blockedByMe) {
      return res.status(400).json({ message: 'You have blocked this contact. Unblock to send a message.' });
    }

    const blockedByThem = recipientUser?.blockedUsers?.some((b) => b.toString() === req.user._id.toString());
    if (blockedByThem) {
      return res.status(403).json({ message: 'You cannot send messages to this contact.' });
    }

    const text = (req.body.text || '').trim();
    let attachment = null;

    if (req.file) {
      attachment = {
        url: `/uploads/messages/${req.file.filename}`,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      };
    }

    if (!text && !attachment) {
      return res.status(400).json({ message: 'Message text or attachment is required.' });
    }

    const message = await Message.create({
      conversationId: id,
      sender: req.user._id,
      recipient: recipientId,
      text,
      attachment,
      read: false,
    });

    const snippet = text || (attachment ? `📎 ${attachment.originalName}` : '');
    conversation.lastMessage = snippet.slice(0, 100);
    conversation.lastMessageAt = new Date();
    // Un-hide conversation if it was deleted
    conversation.deletedFor = [];

    const currentCount = conversation.get(`unreadCounts.${recipientId.toString()}`) || 0;
    conversation.set(`unreadCounts.${recipientId.toString()}`, currentCount + 1);
    await conversation.save();

    await message.populate('sender', 'name profilePicture');

    // Notify recipient if their message notification preferences allow it
    try {
      const wantsAlert = recipientUser?.notificationPreferences?.newMessageAlerts !== false;
      if (wantsAlert) {
        const notifUrl = recipientUser?.role === 'teacher'
          ? `/teacher/messages?conversation=${id}`
          : `/student/messages?conversation=${id}`;
        await Notification.create({
          recipient: recipientId,
          eventKey: `message:${message._id}`,
          kind: 'message',
          sourceId: conversation._id,
          title: `New message from ${req.user.name}`,
          message: (snippet || 'Sent you an attachment').slice(0, 150),
          url: notifUrl,
        });
      }
    } catch (notifErr) {
      console.error('Failed to notify recipient of message:', notifErr.name);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Unable to send message.' });
  }
});

// ── POST /conversations/:id/block (Toggle block contact) ─────────────────────
router.post('/conversations/:id/block', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid conversation ID.' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const otherUserId = conversation.participants.find(
      (p) => p.toString() !== req.user._id.toString()
    );
    if (!otherUserId) {
      return res.status(400).json({ message: 'Other participant not found.' });
    }

    const user = await User.findById(req.user._id);
    if (!user.blockedUsers) user.blockedUsers = [];

    const isAlreadyBlocked = user.blockedUsers.some(
      (uid) => uid.toString() === otherUserId.toString()
    );

    let isBlocked = false;
    if (isAlreadyBlocked) {
      user.blockedUsers = user.blockedUsers.filter(
        (uid) => uid.toString() !== otherUserId.toString()
      );
      isBlocked = false;
    } else {
      user.blockedUsers.push(otherUserId);
      isBlocked = true;
    }
    await user.save();

    res.json({
      success: true,
      isBlocked,
      message: isBlocked ? 'Contact has been blocked.' : 'Contact has been unblocked.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update block status.' });
  }
});

// ── DELETE /conversations/:id (Delete conversation for current user) ──────────
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid conversation ID.' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (!conversation.deletedFor) conversation.deletedFor = [];
    if (!conversation.deletedFor.some((uid) => uid.toString() === req.user._id.toString())) {
      conversation.deletedFor.push(req.user._id);
    }

    // If both participants deleted, clean up messages and conversation
    const allDeleted = conversation.participants.every((p) =>
      conversation.deletedFor.some((d) => d.toString() === p.toString())
    );

    if (allDeleted) {
      await Message.deleteMany({ conversationId: id });
      await Conversation.findByIdAndDelete(id);
    } else {
      await conversation.save();
    }

    res.json({ success: true, message: 'Conversation deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete conversation.' });
  }
});

// ── GET /contacts (Find people to chat with) ──────────────────────────────────
router.get('/contacts', async (req, res) => {
  try {
    const contactsMap = new Map();

    if (req.user.role === 'teacher') {
      // 1. Students enrolled in teacher's subjects
      const subjects = await Subject.find({ teacherId: req.user._id })
        .populate('enrolledStudents', 'name email role profilePicture')
        .lean();

      subjects.forEach((s) => {
        (s.enrolledStudents || []).forEach((st) => {
          if (st && st._id.toString() !== req.user._id.toString()) {
            contactsMap.set(st._id.toString(), {
              _id: st._id,
              name: st.name,
              email: st.email,
              role: st.role || 'student',
              profilePicture: st.profilePicture,
              subtitle: `Student · ${s.code}`,
            });
          }
        });
      });

      // 2. Students who booked tutoring sessions with this teacher
      const bookings = await Booking.find({ teacher: req.user._id })
        .populate('student', 'name email role profilePicture')
        .lean();

      bookings.forEach((b) => {
        if (b.student && b.student._id.toString() !== req.user._id.toString()) {
          const id = b.student._id.toString();
          if (!contactsMap.has(id)) {
            contactsMap.set(id, {
              _id: b.student._id,
              name: b.student.name,
              email: b.student.email,
              role: b.student.role || 'student',
              profilePicture: b.student.profilePicture,
              subtitle: `Tutoring Student · ${b.subject || ''}`,
            });
          }
        }
      });
    } else {
      // Student role:
      // 1. Instructors of enrolled subjects
      const enrolledSubjects = await Subject.find({ enrolledStudents: req.user._id })
        .populate('teacherId', 'name email role profilePicture')
        .lean();

      enrolledSubjects.forEach((s) => {
        if (s.teacherId && s.teacherId._id.toString() !== req.user._id.toString()) {
          contactsMap.set(s.teacherId._id.toString(), {
            _id: s.teacherId._id,
            name: s.teacherId.name,
            email: s.teacherId.email,
            role: s.teacherId.role || 'teacher',
            profilePicture: s.teacherId.profilePicture,
            subtitle: `Instructor · ${s.code}`,
          });
        }
      });

      // 2. Tutors who have active tutor profiles
      const tutors = await TeacherProfile.find({ isPublic: { $ne: false } })
        .populate('user', 'name email role profilePicture')
        .lean();

      tutors.forEach((t) => {
        if (t.user && t.user._id.toString() !== req.user._id.toString()) {
          const id = t.user._id.toString();
          if (!contactsMap.has(id)) {
            contactsMap.set(id, {
              _id: t.user._id,
              name: t.user.name,
              email: t.user.email,
              role: t.user.role || 'teacher',
              profilePicture: t.user.profilePicture,
              subtitle: `Tutor · ${t.subject || 'Instructor'}`,
            });
          }
        }
      });
    }

    // 3. Anyone with whom an existing conversation exists
    const existingConvs = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name email role profilePicture')
      .lean();

    existingConvs.forEach((conv) => {
      conv.participants.forEach((p) => {
        if (p && p._id.toString() !== req.user._id.toString()) {
          const id = p._id.toString();
          if (!contactsMap.has(id)) {
            contactsMap.set(id, {
              _id: p._id,
              name: p.name,
              email: p.email,
              role: p.role,
              profilePicture: p.profilePicture,
              subtitle: p.role === 'teacher' ? 'Teacher' : 'Student',
            });
          }
        }
      });
    });

    const list = Array.from(contactsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load contacts.' });
  }
});

// ── GET /download/:filename ───────────────────────────────────────────────────
router.get('/download/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Attachment file not found.' });
    }

    const downloadName = req.query.name || filename;
    res.download(filePath, downloadName);
  } catch (err) {
    res.status(500).json({ message: 'Unable to download attachment.' });
  }
});

module.exports = router;

