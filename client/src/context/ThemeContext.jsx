import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const ThemeContext =
  createContext(null);

export const ThemeProvider = ({
  children,
}) => {
  const [darkMode, setDarkMode] =
    useState(() => {
      return (
        localStorage.getItem(
          "turolink-theme"
        ) === "dark"
      );
    });

  useEffect(() => {
    localStorage.setItem(
      "turolink-theme",
      darkMode
        ? "dark"
        : "light"
    );
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(
      (previous) => !previous
    );
  };

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        setDarkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider."
    );
  }

  return context;
};