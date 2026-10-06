import axios from 'axios';

// All browser calls go through the Next.js proxy (/api/proxy/*), which attaches
// the httpOnly session cookie and talks to the NestJS API server-side. There are
// no tokens or backend URLs in client code.
export const apiClient = axios.create({ baseURL: '/api/proxy' });

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? '';
    if (error.response?.status === 401 && !url.startsWith('/auth/me')) {
      window.dispatchEvent(new Event('legends:logout'));
    }
    return Promise.reject(error);
  },
);
