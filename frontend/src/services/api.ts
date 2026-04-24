import axios from "axios";

/** Axios instance pre-configured to talk to the FastAPI backend. */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  timeout: 15_000,
});

/** Check whether an axios error is a network/connection failure. */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

/** Check whether an axios error is a 404 Not Found. */
export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export default api;
