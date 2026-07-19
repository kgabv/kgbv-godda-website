import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export const LOGO_URL = "https://customer-assets-wrfwihn1.emergentagent.net/job_e3f9b288-4ca0-4b1b-858c-48bc26649331/artifacts/7brhlrkg_IMG_20260704_154418.png";
