import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    localStorage.removeItem('turolinkToken');
    const expired = () => setUser(null);
    window.addEventListener('turolink:session-expired', expired);
    api.get('/auth/me').then(response => { if (active) setUser(response.data); }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.removeEventListener('turolink:session-expired', expired); };
  }, []);
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    return data;
  };
  const register = async (body) => (await api.post('/auth/register', body)).data;
  const registerTeacher = async (body) => (await api.post('/teacher/register', body)).data;
  const logout = async () => { await api.post('/auth/logout'); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, isAuthenticated: Boolean(user?.emailVerified), login, register, registerTeacher, logout, updateUser: setUser }}>{children}</AuthContext.Provider>;
};
// The provider and its hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
