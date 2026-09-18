import { useEffect, useState } from "react";
import TutorCard from "../components/TutorCard";
import api from "../services/api";

const categories = [
  "Mathematics",
  "Science",
  "English",
  "Programming",
  "History",
  "Filipino",
];

const FindTutors = () => {
  const [tutors, setTutors] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const fetchTutors = async () => {
    try {
      const response = await api.get("/tutors", {
        params: {
          search,
          category,
        },
      });

      setTutors(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTutors();
  }, [category]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchTutors();
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Find Tutors
        </h1>

        <p className="mt-2 text-gray-500">
          Find the perfect tutor for your learning needs.
        </p>
      </div>

      {/* Search */}
      <form
        onSubmit={handleSubmit}
        className="mb-10 flex gap-3"
      >
        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search tutor or subject..."
          className="flex-1 rounded-xl border px-5 py-3 outline-none focus:border-indigo-500"
        />

        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-6 font-semibold text-white"
        >
          Search
        </button>
      </form>

      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">

        {/* Sidebar */}
        <aside>
          <h2 className="mb-4 font-bold">
            Subjects
          </h2>

          <div className="space-y-2">

            <button
              onClick={() => setCategory("")}
              className={`block w-full rounded-lg px-4 py-2 text-left ${
                category === ""
                  ? "bg-indigo-100 text-indigo-700"
                  : "hover:bg-gray-100"
              }`}
            >
              All Subjects
            </button>

            {categories.map((item) => (
              <button
                key={item}
                onClick={() =>
                  setCategory(item)
                }
                className={`block w-full rounded-lg px-4 py-2 text-left ${
                  category === item
                    ? "bg-indigo-100 text-indigo-700"
                    : "hover:bg-gray-100"
                }`}
              >
                {item}
              </button>
            ))}

          </div>
        </aside>

        {/* Tutor Grid */}
        <section>

          {tutors.length === 0 ? (
            <div className="rounded-xl border p-10 text-center">
              <p className="text-gray-500">
                No tutors found.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {tutors.map((tutor) => (
                <TutorCard
                  key={tutor._id}
                  tutor={tutor}
                />
              ))}
            </div>
          )}

        </section>

      </div>

    </main>
  );
};

export default FindTutors;