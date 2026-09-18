import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const TutorProfile = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTutor = async () => {
      try {
        const response = await api.get(
          `/tutors/${id}`
        );

        setTutor(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTutor();
  }, [id]);

  const requireAuth = (callback) => {
    if (!isAuthenticated) {
      navigate(
        `/login?redirect=${encodeURIComponent(
          `/tutors/${id}`
        )}`
      );

      return;
    }

    callback();
  };

  const handleApply = async (subjectId) => {
    if (!isAuthenticated) {
      navigate(
        `/login?redirect=${encodeURIComponent(
          `/tutors/${id}`
        )}`
      );

      return;
    }

    try {
      await api.post("/enrollments", {
        tutor: tutor._id,
        subject: subjectId,
      });

      alert(
        "Your enrollment request has been sent!"
      );
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Unable to send request."
      );
    }
  };

  const handleMessage = () => {
    requireAuth(() => {
      navigate(
        `/messages?tutor=${tutor._id}`
      );
    });
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading tutor...
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="p-10 text-center">
        Tutor not found.
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">

      {/* Profile Header */}
      <section className="rounded-3xl bg-indigo-50 p-8">

        <div className="flex flex-col gap-8 md:flex-row">

          <div className="h-48 w-48 shrink-0 overflow-hidden rounded-2xl bg-gray-200">

            {tutor.user?.profilePicture ? (
              <img
                src={tutor.user.profilePicture}
                alt={tutor.user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-7xl">
                👨‍🏫
              </div>
            )}

          </div>

          <div className="flex-1">

            <h1 className="text-4xl font-bold">
              {tutor.user?.name}
            </h1>

            <p className="mt-2 text-indigo-600">
              ⭐ {tutor.rating || "New Tutor"}
            </p>

            <p className="mt-5 text-gray-600">
              {tutor.bio ||
                "This tutor has not added a bio yet."}
            </p>

            <div className="mt-6 flex gap-3">

              <button
                onClick={handleMessage}
                className="rounded-xl border border-indigo-600 px-5 py-3 font-semibold text-indigo-600"
              >
                Message Tutor
              </button>

            </div>

          </div>

        </div>
      </section>

      {/* Details */}
      <section className="mt-10">

        <h2 className="text-2xl font-bold">
          About the Tutor
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">

          <div className="rounded-2xl border p-5">
            <p className="text-sm text-gray-500">
              Education
            </p>

            <p className="mt-2 font-medium">
              {tutor.education ||
                "Not specified"}
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <p className="text-sm text-gray-500">
              Experience
            </p>

            <p className="mt-2 font-medium">
              {tutor.experience ||
                "Not specified"}
            </p>
          </div>

        </div>

      </section>

      {/* Subjects */}
      <section className="mt-12">

        <h2 className="text-2xl font-bold">
          Offered Subjects
        </h2>

        <div className="mt-6 space-y-4">

          {tutor.subjects?.map((subject) => (
            <div
              key={subject._id}
              className="flex flex-col justify-between gap-5 rounded-2xl border bg-white p-6 shadow-sm sm:flex-row sm:items-center"
            >

              <div>

                <h3 className="text-xl font-bold">
                  {subject.name}
                </h3>

                <p className="mt-1 text-gray-500">
                  {subject.description}
                </p>

                <div className="mt-3 flex gap-4 text-sm text-gray-500">
                  <span>
                    {subject.duration}
                  </span>

                  <span>
                    ₱{subject.price}/session
                  </span>
                </div>

              </div>

              <button
                onClick={() =>
                  handleApply(subject._id)
                }
                className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
              >
                Apply now
              </button>

            </div>
          ))}

        </div>

      </section>

    </main>
  );
};

export default TutorProfile;