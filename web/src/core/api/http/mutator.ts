import type { AxiosRequestConfig } from 'axios';

import { axiosInstance } from './axios';

// Orval's generated multipart calls (file uploads) hardcode
// `Content-Type: multipart/form-data` with no `boundary` param. Sent as-is,
// the server's multipart parser can't split the body into fields at all -
// for an upload like `admin/users/import` that means `file.buffer` never
// contains the actual file bytes, so anything reading it downstream (e.g.
// ExcelJS trying to parse it as a spreadsheet) fails on effectively empty
// input. Stripping the header here lets the browser/axios set its own
// `multipart/form-data; boundary=...` for any `FormData` payload.
export function customInstance<T>(config: AxiosRequestConfig): Promise<T> {
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }

  return axiosInstance(config).then((response) => response.data as T);
}
