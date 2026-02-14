import axios from "axios";

/** Axios instance pre-configured to talk to the FastAPI backend. */
const api = axios.create({
  baseURL: "http://localhost:8000",
});

export default api;
