import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("turolinkToken");

  useEffect(() => {
    const loadUser = async () => {
      const savedToken =
        localStorage.getItem("turolinkToken");

      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");

        setUser(response.data);
      } catch (error) {
        localStorage.removeItem("turolinkToken");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    localStorage.setItem(
      "turolinkToken",
      response.data.token
    );

    setUser(response.data.user);

    return response.data;
  };

  const register = async ({
    name,
    email,
    phone,
    password,
  }) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      phone,
      password,
    });

    localStorage.setItem(
      "turolinkToken",
      response.data.token
    );

    setUser(response.data.user);

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("turolinkToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};