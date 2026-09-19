import axios from 'axios';

// VITE_API_URL points at a separately-hosted backend (e.g. Railway) in
// production. Locally — and if it's ever left unset — this stays empty so
// every path below stays relative, which the Vite dev server proxies to
// localhost:5000 (see vite.config.js). Concatenating an unset VITE_API_URL
// directly used to bake the literal string "undefined/api" into every
// request, breaking the entire app (every API call failed) whenever the
// variable wasn't set.
export const backendOrigin = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${backendOrigin}/api`,
  withCredentials: true,
});

// Surface a consistent { status, message, details } shape to callers
// regardless of whether the failure was a network error or an API error.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      return Promise.reject({
        status,
        message: data?.message || 'Something went wrong. Please try again.',
        details: data?.details || null,
      });
    }

    return Promise.reject({
      status: 0,
      message: 'Cannot reach the server. Check your connection and try again.',
      details: null,
    });
  }
);

export default api;