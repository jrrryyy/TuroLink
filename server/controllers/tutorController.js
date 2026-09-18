const TutorProfile = require("../models/TutorProfile");
const Subject = require("../models/Subject");

const getTutors = async (req, res) => {
  try {
    const { search, category } = req.query;

    let query = {};

    if (category) {
      query.categories = category;
    }

    let tutors = await TutorProfile.find(query)
      .populate("user", "name email profilePicture")
      .populate("subjects");

    if (search) {
      const searchText = search.toLowerCase();

      tutors = tutors.filter((tutor) => {
        const tutorName =
          tutor.user?.name?.toLowerCase() || "";

        const subjects = tutor.subjects
          .map((subject) => subject.name.toLowerCase())
          .join(" ");

        return (
          tutorName.includes(searchText) ||
          subjects.includes(searchText)
        );
      });
    }

    res.json(tutors);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getTutorById = async (req, res) => {
  try {
    const tutor = await TutorProfile.findById(req.params.id)
      .populate("user", "name email profilePicture")
      .populate("subjects");

    if (!tutor) {
      return res.status(404).json({
        message: "Tutor not found.",
      });
    }

    res.json(tutor);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getTutors,
  getTutorById,
};