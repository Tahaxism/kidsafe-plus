import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';

const baseURL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'http://localhost:8787';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let _token: string | null = null;
export const setAuthToken = (t: string | null): void => {
  _token = t;
};
api.interceptors.request.use((config) => {
  if (_token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${_token}`;
  }
  return config;
});

export const checkBackend = async (): Promise<boolean> => {
  try {
    const res = await api.get('/health');
    return res.status === 200;
  } catch {
    return false;
  }
};
