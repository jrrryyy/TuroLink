import api from './api';
export const profilePictureUrl = (value) => value ? new URL(value, new URL(api.defaults.baseURL, window.location.origin).origin).href : '';
