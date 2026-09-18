import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api, {
  setAuthToken,
} from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem("token")
  );

  const isAuthenticated = !!token && !!user;

  useEffect(() => {
    const initializeAuth = async () => {
      if (!token) return;

      try {
        setAuthToken(token);

        const response = await api.get("/auth/me");

        setUser(response.data.user);
      } catch (error) {
        logout();
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const { user, token } = response.data;

    localStorage.setItem("token", token);

    setToken(token);
    setUser(user);

    setAuthToken(token);

    return user;
  };

  const logout = () => {
    localStorage.removeItem("token");

    setToken(null);
    setUser(null);

    setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () =>
  useContext(AuthContext);