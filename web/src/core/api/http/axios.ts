import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@core/config/env';

import { handleUnauthorized } from './refresh-queue';

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

interface ISuccessEnvelope {
  success: true;
  data: unknown;
  timestamp: string;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));

  return match ? decodeURIComponent(match[1]) : null;
}

export const axiosInstance = axios.create({
  // Orval bakes the full `/api/v1/...` path (API_PREFIX + version) into
  // every generated call already, straight from the live OpenAPI spec —
  // this only needs to supply the origin.
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = config.method?.toLowerCase();

  if (method && MUTATING_METHODS.has(method)) {
    const csrfToken = readCookie('XSRF-TOKEN');

    if (csrfToken) {
      config.headers.set('X-XSRF-TOKEN', csrfToken);
    }
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ISuccessEnvelope>) =>
    ({ ...response, data: response.data.data }) as AxiosResponse,
  (error: AxiosError) => handleUnauthorized(error, (config) => axiosInstance(config)),
);
