import { getLlmApiBaseUrl } from '../config/environment';

// Remove unused imports and variables if they're not needed elsewhere
// const API_BASE_URL = process.env.REACT_APP_API_URL;
// const MAIN_API_BASE_URL = process.env.REACT_APP_MAIN_API_URL;
// const LLM_API_BASE_URL = process.env.REACT_APP_LLM_API_URL;
// const LLM_API_URL = process.env.REACT_APP_LLM_API_URL;

// Network utility functions
export const checkMainServerConnection = async () => {
  try {
    const response = await fetch('/api/health/');
    return response.ok;
  } catch (error) {
    console.error('Error checking main server connection:', error);
    return false;
  }
};

export const checkLlmServiceConnection = async () => {
  try {
    const llmUrl = getLlmApiBaseUrl();
    const response = await fetch(`${llmUrl}/health/`);
    return response.ok;
  } catch (error) {
    console.error('Error checking LLM service connection:', error);
    return false;
  }
};

export const logNetworkInfo = async () => {
  const mainServerReachable = await checkMainServerConnection();
  const llmServiceReachable = await checkLlmServiceConnection();

  console.log('Network Status:', {
    mainServerReachable,
    llmServiceReachable
  });

  return {
    mainServerReachable,
    llmServiceReachable
  };
};

// Export default object
const networkUtils = {
  checkMainServerConnection,
  checkLlmServiceConnection,
  logNetworkInfo
};

export default networkUtils; 