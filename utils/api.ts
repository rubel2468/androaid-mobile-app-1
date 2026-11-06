import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { storage } from './storage';
import { BASE_URL } from '../constants/Api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor — attach Bearer token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await storage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 & network errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await storage.deleteItem('auth_token');
      await storage.deleteItem('auth_user');
      // Navigation to login is handled by root layout auth check
    }
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    const message =
      (error.response?.data as { message?: string })?.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export const apiGet = <T = unknown>(url: string, params?: object) =>
  api.get<T>(url, { params }).then((r) => r.data);

export const apiPost = <T = unknown>(url: string, data?: object) =>
  api.post<T>(url, data).then((r) => r.data);

export const apiPut = <T = unknown>(url: string, data?: object) =>
  api.put<T>(url, data).then((r) => r.data);

export const apiPatch = <T = unknown>(url: string, data?: object) =>
  api.patch<T>(url, data).then((r) => r.data);

export const apiDelete = <T = unknown>(url: string) =>
  api.delete<T>(url).then((r) => r.data);

export default api;
