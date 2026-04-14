import axios from "axios";
import { showSwal } from "../Components/swal_alert";
import secureLocalStorage from "react-secure-storage";
/**
 * API
 * Central Axios instance used for all HTTP requests in the application.
 * Automatically attaches the auth token to every request header.
 * Handles global 401 session expiry with a user-facing alert and redirect.
 */
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Request interceptor — attaches Bearer token from localStorage to every outgoing request
API.interceptors.request.use((config) => {
  const token = secureLocalStorage.getItem("AUTH_TOKEN");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor — passes successful responses through unchanged
// On 401 (Unauthorized), clears session data and redirects to login
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Skip session expiry handling on the reset-password page to avoid redirect loops
    const isResetPasswordPage =
      window.location.hash.startsWith("#/reset-password");

    if (error?.response?.status === 401 && !isResetPasswordPage) {
      // Clear all stored auth data before redirecting
      secureLocalStorage.clear();
      sessionStorage.clear();

      showSwal({
        text: "Session expired. Please login again.",
        icon: "warning",
      }).then(() => {
        window.location.replace("/#/");
      });
    }

    // Always propagate the error so individual call sites can handle it if needed
    return Promise.reject(error);
  },
);

export default API;
