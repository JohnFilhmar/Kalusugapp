import axios from "axios";
import { jwtDecode } from "jwt-decode";
import useIndexedDB from "./hooks/useIndexedDb";
import config from "./config";

const URL =
  config.REACT_APP_PROJECT_STATE === "production"
    ? `${config.REACT_APP_PRODUCTION_BACKEND_BASE_URL}/api`
    : `${config.REACT_APP_DEVELOPMENT_BACKEND_BASE_URL}/api`;

const api = axios.create({
  baseURL: URL,
});

const cancelTokens = new Map();

const createCancelToken = (key) => {
  if (cancelTokens.has(key)) {
    cancelTokens.get(key).cancel(`Request with key "${key}" canceled due to new request.`);
  }
  const cancelTokenSource = axios.CancelToken.source();
  cancelTokens.set(key, cancelTokenSource);
  return cancelTokenSource.token;
};

const clearCancelToken = (key) => {
  if (cancelTokens.has(key)) {
    cancelTokens.delete(key);
  }
};

const RefreshAccessToken = async (accessToken) => {
  const { updateItem } = useIndexedDB();
  try {
    const decodedToken = jwtDecode(accessToken);
    const response = await axios.post(
      `${URL}/authToken`,
      { username: decodedToken.username },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true,
        secure: true,
      }
    );
    const newAccessToken = response.data.accessToken;
    await updateItem("tokens", "accessToken", newAccessToken);
    return newAccessToken;
  } catch (error) {
    console.error("Unable to refresh token", error);
    throw error;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { getAllItems } = useIndexedDB();
    const originalRequest = error.config;
    if (!originalRequest || !originalRequest.url) {
      return Promise.reject(new Error("Original request is missing or invalid"));
    }
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const tokens = await getAllItems("tokens");
        if (tokens && tokens.accessToken) {
          const newToken = await RefreshAccessToken(tokens.accessToken);
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return axios(originalRequest);
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use(async (conf) => {
  const { getAllItems } = useIndexedDB();
  conf.cancelToken = createCancelToken(conf.url);
  const { accessToken } = await getAllItems("tokens");
  if (accessToken) {
    const decodedToken = jwtDecode(accessToken);
    if (decodedToken.exp * 1000 < Date.now()) {
      const newToken = await RefreshAccessToken(accessToken);
      conf.headers["Authorization"] = `Bearer ${newToken}`;
    } else {
      conf.headers["Authorization"] = `Bearer ${accessToken}`;
    }
  }

  return conf;
});

api.interceptors.response.use(
  (response) => {
    clearCancelToken(response.config.url);
    return response;
  },
  (error) => {
    if (error.config?.url) {
      clearCancelToken(error.config.url);
    }
    return Promise.reject(error);
  }
);

export default api;