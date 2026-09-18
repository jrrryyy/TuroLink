import { Link } from "react-router-dom";

const TutorCard = ({ tutor }) => {
  const user = tutor.user;

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">

      <div className="h-52 bg-gray-100">
        {user?.profilePicture ? (
          <img
            src={user.profilePicture}
            alt={user.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">
            👨‍🏫
          </div>
        )}
      </div>

      <div className="p-5">

        <h3 className="text-xl font-bold">
          {user?.name}
        </h3>

        <p className="mt-1 text-sm text-indigo-600">
          {tutor.subjects?.[0]?.name ||
            "General Tutor"}
        </p>

        <p className="mt-3 line-clamp-2 text-sm text-gray-500">
          {tutor.bio ||
            "Experienced tutor ready to help students learn."}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            ⭐ {tutor.rating || "New"}
          </span>

          <Link
            to={`/tutors/${tutor._id}`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            View Profile
          </Link>
        </div>

      </div>
    </div>
  );
};

export default TutorCard;