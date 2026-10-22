import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001' });

export const api = {
  list: <T,>(r: string, params?: object) => http.get<T[]>('/' + r, { params }).then((x) => x.data),
  create: <T,>(r: string, body: object) => http.post<T>('/' + r, body).then((x) => x.data),
  update: <T,>(r: string, id: number, body: object) => http.patch<T>(`/${r}/${id}`, body).then((x) => x.data),
  remove: (r: string, id: number) => http.delete(`/${r}/${id}`),
};

export const errMsg = (e: unknown) =>
  axios.isAxiosError(e)
    ? e.response ? `Server error ${e.response.status}` : 'Cannot reach API. Is json-server running (npm run api)?'
    : (e as Error).message;

export const logActivity = (message: string) =>
  api.create('activities', { message, date: new Date().toISOString() }).catch(() => undefined);

export function useList<T>(resource: string, params?: Record<string, unknown>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const key = JSON.stringify(params ?? {});
  const reload = useCallback(async () => {
    try { setData(await api.list<T>(resource, JSON.parse(key))); setError(''); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [resource, key]);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}
