import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api/user";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // set to true only if using cookies/sessions
});

// JSON-based Login
export const loginUser = async (email, password) => {
  try {
    const response = await api.post(
      "/login",
      { email, password },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data?.detail || "Login failed";
  }
};

// JSON-based Register
export const registerUser = async (username, email, password) => {
  try {
    const response = await api.post(
      "/register",
      { username, email, password },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data?.detail || "Registration failed";
  }
};
