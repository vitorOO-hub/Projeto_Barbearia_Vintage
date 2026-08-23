import axios from "axios";

let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});