import axios from 'axios';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: CONFIG.serverUrl });
const authAxiosInstance = axios.create({ baseURL: CONFIG.authServerUrl || CONFIG.serverUrl });

axiosInstance.interceptors.response.use((response) => response, (error) => Promise.reject(error));

authAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args) => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args];

    const res = await axiosInstance.get(url, { ...config });

    return res.data;
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const endpoints = {
  auth: {
    signIn: '/auth/session',
    signUp: '/auth/register',
    refresh: '/auth/refresh',
  },
};

export const authClient = authAxiosInstance;
