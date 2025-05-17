import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const registerUser = async (userData) => {
  try {
    const response = await api.post('/api/accounts/register/', userData);
    return response.data;
  } catch (error) {
    console.error('Error registering user with backend:', error);
    throw error;
  }
};

export const syncUserWithBackend = async (userData) => {
  try {
    console.log('Syncing user with backend:', userData);
    const response = await api.post('/api/accounts/sync/', {
      email: userData.email,
      password: userData.password,
      supabase_uid: userData.supabase_uid
    });
    console.log('Sync response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error syncing user with backend:', error.response?.data || error);
    throw error;
  }
};

export default api; 