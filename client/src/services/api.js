import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
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