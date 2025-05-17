import axios from 'axios';

// API Configuration
export const API_BASE_URL = 'http://localhost:8000';
const API_PREFIX = '/api';  // Separate prefix for clarity

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
            console.log('Adjusted request URL:', config.url);
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
console.log('API Config - Base URL:', API_BASE_URL);
console.log('API Config - Prefix:', API_PREFIX);

export default api;