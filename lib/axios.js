// ONE shared Axios instance for the whole app.
// Rule from the assignment: "Create one shared Axios setup file. It should
// add the login token to every request and handle errors in one place."
import axios from "axios";
import { getToken } from "./auth";

const api = axios.create({
  baseURL: "https://dummyjson.com",
});

// Runs before every request leaves the app: attach the token if we have one.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Runs after every response/error comes back: one central place to log/handle errors.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) {
      // A request we cancelled on purpose (e.g. superseded search) - not a real error.
      return Promise.reject(error);
    }
    if (error.response) {
      console.error("API error:", error.response.status, error.response.data);
      if (error.response.status === 401 && typeof window !== "undefined") {
        // Token missing/expired/rejected - force back to login from one place,
        // rather than every page having to check for this itself.
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } else {
      console.error("Network error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
