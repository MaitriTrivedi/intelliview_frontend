// Environment configuration file
// Contains all environment-specific variables

// Base URL configurations
export const MAIN_API_BASE_URL = 'http://127.0.0.1:8000'; // Main backend API URL
export const LLM_API_BASE_URL = 'https://fd4a-119-161-98-68.ngrok-free.app/';  // LLM service API URL (remove trailing slash)

// API configuration
export const getApiBaseUrl = () => {
  return MAIN_API_BASE_URL;
};

// LLM API configuration
export const getLlmApiBaseUrl = () => {
  return LLM_API_BASE_URL;
};

// Other environment-specific configurations
export const ENV = process.env.NODE_ENV || 'development';
export const IS_DEVELOPMENT = ENV === 'development';
export const IS_PRODUCTION = ENV === 'production';

// Debug configuration
export const ENABLE_API_LOGS = IS_DEVELOPMENT;
export const ENABLE_LLM_API_LOGS = true;  // Always enable LLM API logs for troubleshooting

// Feature flags
export const FEATURES = {
  USE_MOCK_DATA: IS_DEVELOPMENT, // Use mock data in development mode
  ENABLE_OFFLINE_MODE: false,    // Allow the app to function offline with cached data
  USE_LLM_FALLBACKS: true,      // Use fallback responses when LLM service is unavailable
};

export default {
  MAIN_API_BASE_URL,
  LLM_API_BASE_URL,
  getApiBaseUrl,
  getLlmApiBaseUrl,
  ENV,
  IS_DEVELOPMENT,
  IS_PRODUCTION,
  ENABLE_API_LOGS,
  ENABLE_LLM_API_LOGS,
  FEATURES,
}; 