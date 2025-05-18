import axios from 'axios';
import { getApiBaseUrl, ENABLE_API_LOGS, MAIN_API_BASE_URL } from './environment';

// API Configuration
export const API_BASE_URL = getApiBaseUrl();
const API_PREFIX = '/api';  // Separate prefix for clarity

// Log the current API configuration on startup
if (ENABLE_API_LOGS) {
  console.log('⚙️ API Configuration:');
  console.log(`🔗 Base URL: ${MAIN_API_BASE_URL}`);
  console.log(`🔍 API Prefix: ${API_PREFIX}`);
}

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper function to build URLs with the correct prefix
export const buildApiUrl = (path) => {
    // Make sure path doesn't start with a slash if API_PREFIX has one
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_PREFIX}/${cleanPath}`;
};

// Add a request interceptor to add the auth token and handle paths
api.interceptors.request.use(
    (config) => {
        // Add API prefix to all requests if they don't already have it
        if (config.url && !config.url.startsWith(API_PREFIX) && !config.url.startsWith('http')) {
            config.url = buildApiUrl(config.url);
            if (ENABLE_API_LOGS) {
                console.log('🔄 Adjusted request URL:', config.url);
            }
        }

        // Add token to headers
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// For debugging
if (ENABLE_API_LOGS) {
  console.log('🚀 API Client initialized');
}

export default api;