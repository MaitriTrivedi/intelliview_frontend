import { API_BASE_URL } from '../config/api';
import { MAIN_API_BASE_URL, LLM_API_BASE_URL, getLlmApiBaseUrl } from '../config/environment';

// Get the LLM service URL
const LLM_API_URL = getLlmApiBaseUrl();

// Network utility functions
const checkMainServerConnection = async () => {
  try {
    const response = await fetch('/api/health/');
    return response.ok;
  } catch (error) {
    console.error('Error checking main server connection:', error);
    return false;
  }
};

const checkLlmServiceConnection = async () => {
  try {
    const llmUrl = getLlmApiBaseUrl();
    const response = await fetch(`${llmUrl}/health/`);
    return response.ok;
  } catch (error) {
    console.error('Error checking LLM service connection:', error);
    return false;
  }
};

const logNetworkInfo = async () => {
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

// Export all functions
export {
  checkMainServerConnection,
  checkLlmServiceConnection,
  logNetworkInfo
};

// Export default object
export default {
  checkMainServerConnection,
  checkLlmServiceConnection,
  logNetworkInfo
}; 