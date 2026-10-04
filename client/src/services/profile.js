import api from './api';
export const profilePictureUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return new URL(value, new URL(api.defaults.baseURL, window.location.origin).origin).href;
  } catch {
    return value;
  }
};
