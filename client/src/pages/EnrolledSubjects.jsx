import { useEffect, useState } from "react";
import api from "../services/api";

const EnrolledSubjects = () => {
  const [enrollments, setEnrollments] =
    useState([]);

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const response = await api.get(
          "/enrollments/my"
        );

        setEnrollments(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchEnrollments();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">

      <h1 className="text-3xl font-bold">
        Enrolled Subjects
      </h1>

      <p className="mt-2 text-gray-500">
        Manage your tutor applications and enrolled
        subjects.
      </p>

      <div className="mt-8 space-y-4">

        {enrollments.length === 0 ? (
          <div className="rounded-xl border p-8 text-center text-gray-500">
            You don't have any enrollments yet.
          </div>
        ) : (
          enrollments.map((item) => (
            <div
              key={item._id}
              className="rounded-2xl border p-6"
            >
              <div className="flex justify-between">

                <div>
                  <h2 className="text-xl font-bold">
                    {item.subject?.name}
                  </h2>

                  <p className="text-gray-500">
                    Tutor:{" "}
                    {item.tutor?.user?.name}
                  </p>
                </div>

                <span className="h-fit rounded-full bg-indigo-50 px-4 py-1 text-sm text-indigo-600">
                  {item.status}
                </span>

              </div>
            </div>
          ))
        )}

      </div>

    </main>
  );
};

export default EnrolledSubjects;