import { useCallback, useEffect, useState } from 'react';

const TOKEN = 'naqdix_admin';
export const getToken = () => { try { return localStorage.getItem(TOKEN); } catch { return null; } };
export const setToken = (t) => { try { if (t) localStorage.setItem(TOKEN, t); else localStorage.removeItem(TOKEN); } catch { /* private mode */ } };

export async function api(method, url, body) {
  const t = getToken();
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(t && url.startsWith('/api/admin') ? { Authorization: `Bearer ${t}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && url.startsWith('/api/admin') && !url.endsWith('/login')) { setToken(null); window.location.href = '/admin/login'; }
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
export const get = (u) => api('GET', u);
export const post = (u, b) => api('POST', u, b || {});
export const patch = (u, b) => api('PATCH', u, b || {});
export const put = (u, b) => api('PUT', u, b || {});

export function useApi(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => { if (!url) return; get(url).then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message)); }, [url]);
  useEffect(() => { load(); }, [load]);
  return { data, error, reload: load };
}

export const money = (n, cur = 'KWD') => `${(+n || 0).toFixed(['KWD', 'BHD', 'OMR', 'JOD'].includes(cur) ? 3 : 2)} ${cur}`;
export const date = (ts, lang = 'en') => (ts ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(+ts)) : '');
export const dateTime = (ts) => (ts ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(+ts)) : '');
