
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

// Render backend URL
const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://msc-41rk.onrender.com';

export const http = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Generic API methods
export const api = {
  list: <T,>(resource: string, params?: object): Promise<T[]> =>
    http
      .get<T[]>(`/${resource}`, { params })
      .then((response) => response.data),

  getById: <T,>(resource: string, id: number | string): Promise<T> =>
    http
      .get<T>(`/${resource}/${id}`)
      .then((response) => response.data),

  create: <T,>(resource: string, body: object): Promise<T> =>
    http
      .post<T>(`/${resource}`, body)
      .then((response) => response.data),

  update: <T,>(
    resource: string,
    id: number | string,
    body: object
  ): Promise<T> =>
    http
      .patch<T>(`/${resource}/${id}`, body)
      .then((response) => response.data),

  remove: (resource: string, id: number | string) =>
    http.delete(`/${resource}/${id}`),
};

// Error message helper
export const errMsg = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      return `Server error ${error.response.status}: ${
        error.response.statusText || 'Request failed'
      }`;
    }

    if (error.code === 'ECONNABORTED') {
      return 'API request timed out. Please try again.';
    }

    return 'Cannot reach API. Check your internet connection or Render server.';
  }

  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
};

// Activity logger
export const logActivity = (message: string) =>
  api
    .create('activities', {
      message,
      date: new Date().toISOString(),
    })
    .catch(() => undefined);

// Generic list hook
export function useList<T>(
  resource: string,
  params?: Record<string, unknown>
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const key = JSON.stringify(params ?? {});

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      const result = await api.list<T>(
        resource,
        JSON.parse(key)
      );

      setData(result);
      setError('');
    } catch (error: unknown) {
      setError(errMsg(error));
    } finally {
      setLoading(false);
    }
  }, [resource, key]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    data,
    loading,
    error,
    reload,
  };
}
