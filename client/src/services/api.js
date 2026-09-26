import axios from 'axios';

let rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
rawBaseURL = rawBaseURL.replace(/\/+$/, '');
if (!rawBaseURL.endsWith('/api')) {
  rawBaseURL += '/api';
}

const api = axios.create({
  timeout: 15000,
  baseURL: rawBaseURL,
  withCredentials: true,
  headers: { 'X-TuroLink-Request': '1' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !/\/auth\/(login|google)/.test(error.config?.url || '')) {
      window.dispatchEvent(new Event('turolink:session-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
