import type { AxiosRequestConfig } from 'axios';

import { axiosInstance } from './axios';

export function customInstance<T>(config: AxiosRequestConfig): Promise<T> {
  return axiosInstance(config).then((response) => response.data as T);
}
