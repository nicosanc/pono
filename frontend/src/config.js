// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WS_URL = import.meta.env.VITE_WS_URL || 
  (API_URL.startsWith('https') 
    ? API_URL.replace('https', 'wss') 
    : API_URL.replace('http', 'ws'));

