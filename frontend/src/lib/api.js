import axios from "axios";

if (!import.meta.env.VITE_API_URL) {
  console.warn(
    "[api] VITE_API_URL is not set. " +
    "Create frontend/.env.local with VITE_API_URL=http://localhost:5000/api for local dev."
  );
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 10000,
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("aistudypal_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise error responses so callers always get err.response.data.message
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      error.message = "Request timed out. Please try again.";
    } else if (!error.response) {
      error.message = "Network error. Check your connection.";
    }
    return Promise.reject(error);
  }
);

export default api;
