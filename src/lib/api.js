import axios from 'axios';

const api = axios.create({
  baseURL: 'https://specter-backend-production-95b1.up.railway.app/api',
  timeout: 20000,
});

api.interceptors.response.use(
  r => r.data,
  err => Promise.reject(new Error(err.response?.data?.error || err.message))
);

export const scanToken = (address) => api.get(`/scan/${address}`);
export const getScansLeft = () => api.get('/scans-left');

export default api;
