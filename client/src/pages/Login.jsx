import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(
    location.search
  );

  const redirect =
    params.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      await login(email, password);

      navigate(redirect, {
        replace: true,
      });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Login failed."
      );
    }
  };

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-gray-50 px-6">

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          Welcome back
        </h1>

        <p className="mt-2 text-gray-500">
          Sign in to continue using TuroLink.
        </p>

        {error && (
          <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="w-full rounded-xl border px-4 py-3 outline-none focus:border-indigo-500"
            required
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white"
          >
            Login
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            to={`/register?redirect=${encodeURIComponent(
              redirect
            )}`}
            className="font-semibold text-indigo-600"
          >
            Create one
          </Link>
        </p>

      </div>

    </main>
  );
};

export default Login;