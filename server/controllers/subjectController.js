const Subject =
  require("../models/Subject");


// ============================================
// GET TEACHER SUBJECTS
// GET /api/subjects/my-subjects
// ============================================

const getTeacherSubjects =
  async (req, res) => {
    try {
      const subjects =
        await Subject.find({
          teacherId:
            req.user._id,
        }).sort({
          createdAt: -1,
        });

      res
        .status(200)
        .json(subjects);
    } catch (error) {
      console.error(
        "Get teacher subjects error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load subjects.",
      });
    }
  };


// ============================================
// GET ONE SUBJECT
// GET /api/subjects/:id
// ============================================

const getSubject =
  async (req, res) => {
    try {
      const subject =
        await Subject.findOne({
          _id: req.params.id,

          teacherId:
            req.user._id,
        });

      if (!subject) {
        return res
          .status(404)
          .json({
            message:
              "Subject not found.",
          });
      }

      res
        .status(200)
        .json(subject);
    } catch (error) {
      console.error(
        "Get subject error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load subject.",
      });
    }
  };


// ============================================
// CREATE SUBJECT
// POST /api/subjects
// ============================================

const createSubject =
  async (req, res) => {
    try {
      const {
        code,
        title,
        description,
      } = req.body;

      if (
        !code?.trim() ||
        !title?.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Subject code and title are required.",
          });
      }

      const subject =
        await Subject.create({
          teacherId:
            req.user._id,

          code:
            code.trim(),

          title:
            title.trim(),

          description:
            description?.trim() ||
            "",
        });

      res
        .status(201)
        .json(subject);
    } catch (error) {
      console.error(
        "Create subject error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create subject.",
      });
    }
  };


// ============================================
// UPDATE SUBJECT
// PUT /api/subjects/:id
// ============================================

const updateSubject =
  async (req, res) => {
    try {
      const subject =
        await Subject.findOne({
          _id: req.params.id,

          teacherId:
            req.user._id,
        });

      if (!subject) {
        return res
          .status(404)
          .json({
            message:
              "Subject not found.",
          });
      }

      const {
        code,
        title,
        description,
      } = req.body;

      if (
        code !== undefined
      ) {
        subject.code =
          code.trim();
      }

      if (
        title !== undefined
      ) {
        subject.title =
          title.trim();
      }

      if (
        description !==
        undefined
      ) {
        subject.description =
          description.trim();
      }

      const updatedSubject =
        await subject.save();

      res
        .status(200)
        .json(updatedSubject);
    } catch (error) {
      console.error(
        "Update subject error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update subject.",
      });
    }
  };


// ============================================
// DELETE SUBJECT
// DELETE /api/subjects/:id
// ============================================

const deleteSubject =
  async (req, res) => {
    try {
      const subject =
        await Subject
          .findOneAndDelete({
            _id: req.params.id,

            teacherId:
              req.user._id,
          });

      if (!subject) {
        return res
          .status(404)
          .json({
            message:
              "Subject not found.",
          });
      }

      res.status(200).json({
        message:
          "Subject deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete subject error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete subject.",
      });
    }
  };


// ============================================
// CREATE ANNOUNCEMENT
// POST /api/subjects/:id/announcements
// ============================================

const createAnnouncement =
  async (req, res) => {
    try {
      const {
        content,
        link,
        scheduledAt,
      } = req.body;


      // Allow:
      // - text only
      // - file only
      // - link only
      // - or combination

      if (
        !content?.trim() &&
        !req.file &&
        !link?.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Add announcement text, a file, or a link.",
          });
      }


      const subject =
        await Subject.findOne({
          _id: req.params.id,

          teacherId:
            req.user._id,
        });


      if (!subject) {
        return res
          .status(404)
          .json({
            message:
              "Subject not found.",
          });
      }


      // =====================================
      // LINK VALIDATION
      // =====================================

      let cleanLink = "";

      if (link?.trim()) {
        try {
          const parsed =
            new URL(
              link.trim()
            );

          if (
            parsed.protocol !==
              "http:" &&
            parsed.protocol !==
              "https:"
          ) {
            return res
              .status(400)
              .json({
                message:
                  "Link must use http or https.",
              });
          }

          cleanLink =
            parsed.toString();
        } catch {
          return res
            .status(400)
            .json({
              message:
                "Please enter a valid link.",
            });
        }
      }


      // =====================================
      // SCHEDULE
      // =====================================

      let scheduleDate = null;

      let status =
        "posted";


      if (scheduledAt) {
        scheduleDate =
          new Date(
            scheduledAt
          );

        if (
          Number.isNaN(
            scheduleDate
              .getTime()
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                "Invalid announcement schedule.",
            });
        }


        if (
          scheduleDate <=
          new Date()
        ) {
          return res
            .status(400)
            .json({
              message:
                "Scheduled time must be in the future.",
            });
        }

        status =
          "scheduled";
      }


      // =====================================
      // FILE
      // =====================================

      let attachment = "";

      let attachmentName = "";

      let attachmentType = "";


      if (req.file) {
        attachment =
          `/uploads/announcements/${req.file.filename}`;

        attachmentName =
          req.file.originalname;

        attachmentType =
          req.file.mimetype;
      }


      // =====================================
      // SAVE
      // =====================================

      subject.announcements.push({
        content:
          content?.trim() ||
          "",

        attachment,

        attachmentName,

        attachmentType,

        link: cleanLink,

        status,

        scheduledAt:
          scheduleDate,

        postedAt:
          status === "posted"
            ? new Date()
            : null,
      });


      await subject.save();


      const announcement =
        subject.announcements[
          subject.announcements
            .length - 1
        ];


      res.status(201).json({
        message:
          status ===
          "scheduled"
            ? "Announcement scheduled successfully."
            : "Announcement posted successfully.",

        announcement,
      });
    } catch (error) {
      console.error(
        "Create announcement error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create announcement.",
      });
    }
  };


// ============================================
// DELETE ANNOUNCEMENT
// DELETE /api/subjects/:id/announcements/:announcementId
// ============================================

const deleteAnnouncement =
  async (req, res) => {
    try {
      const subject =
        await Subject.findOne({
          _id: req.params.id,

          teacherId:
            req.user._id,
        });


      if (!subject) {
        return res
          .status(404)
          .json({
            message:
              "Subject not found.",
          });
      }


      const announcement =
        subject.announcements.id(
          req.params
            .announcementId
        );


      if (!announcement) {
        return res
          .status(404)
          .json({
            message:
              "Announcement not found.",
          });
      }


      subject.announcements.pull(
        req.params
          .announcementId
      );


      await subject.save();


      res.status(200).json({
        message:
          "Announcement deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete announcement error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete announcement.",
      });
    }
  };


module.exports = {
  getTeacherSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  createAnnouncement,
  deleteAnnouncement,
};