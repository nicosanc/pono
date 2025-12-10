// API Configuration
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_URL = rawApiUrl.replace(/\/+$/, ''); // Remove trailing slashes
export const WS_URL = import.meta.env.VITE_WS_URL || 
  (API_URL.startsWith('https') 
    ? API_URL.replace('https', 'wss') 
    : API_URL.replace('http', 'ws'));

