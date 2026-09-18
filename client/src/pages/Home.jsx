import { Link } from "react-router-dom";

const Home = () => {
  return (
    <main>

      {/* Hero */}
      <section className="bg-indigo-50">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2">

          <div>
            <p className="mb-3 font-semibold text-indigo-600">
              LEARN • CONNECT • GROW
            </p>

            <h1 className="text-4xl font-bold leading-tight text-gray-900 md:text-6xl">
              Find the right tutor
              <span className="text-indigo-600">
                {" "}for you.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-gray-600">
              TuroLink connects students with tutors
              who can help them understand subjects,
              improve their skills, and reach their goals.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                to="/tutors"
                className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
              >
                Find a Tutor
              </Link>

              <Link
                to="/tutors"
                className="rounded-xl border border-indigo-600 px-6 py-3 font-semibold text-indigo-600"
              >
                Explore Subjects
              </Link>
            </div>
          </div>

          {/* Placeholder Illustration */}
          <div className="flex h-96 items-center justify-center rounded-3xl bg-white shadow-sm">
            <div className="text-center">
              <div className="text-8xl">
                👨‍🏫
              </div>

              <p className="mt-4 text-gray-500">
                Tutor illustration
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">
          Why use TuroLink?
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">

          {[
            [
              "🔎",
              "Find Tutors",
              "Search tutors based on subjects and categories.",
            ],
            [
              "📚",
              "Learn Better",
              "Connect with tutors who can help you improve.",
            ],
            [
              "💬",
              "Stay Connected",
              "Message tutors and manage your learning.",
            ],
          ].map(([icon, title, description]) => (
            <div
              key={title}
              className="rounded-2xl border bg-white p-6 text-center shadow-sm"
            >
              <div className="text-4xl">{icon}</div>

              <h3 className="mt-4 text-xl font-bold">
                {title}
              </h3>

              <p className="mt-2 text-gray-500">
                {description}
              </p>
            </div>
          ))}

        </div>
      </section>

    </main>
  );
};

export default Home;