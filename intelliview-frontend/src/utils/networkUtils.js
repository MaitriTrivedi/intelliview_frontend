import { API_BASE_URL } from '../config/api';
import { MAIN_API_BASE_URL, LLM_API_BASE_URL, getLlmApiBaseUrl } from '../config/environment';

// Get the LLM service URL
const LLM_API_URL = getLlmApiBaseUrl();

/**
 * Checks if the main server is reachable
 * @returns {Promise<boolean>} True if server is reachable
 */
export const checkServerConnection = async () => {
  try {
    // Make sure we don't have double slashes in the URL
    const url = `${MAIN_API_BASE_URL}/api/health-check/`.replace(/([^:]\/)\/+/g, "$1");
    console.log('Checking main server connection at:', url);
    
    // Simple ping to the server
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Only wait for 5 seconds max
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    console.error('Server connection check failed:', error);
    return false;
  }
};

/**
 * Checks if the LLM service is reachable
 * @returns {Promise<boolean>} True if LLM service is reachable
 */
export const checkLlmServiceConnection = async () => {
  try {
    // Use our Django proxy to avoid CORS issues
    // Don't include api/ in the endpoint as it's added by the proxy view
    const url = `${MAIN_API_BASE_URL}/api/llm/health-check`.replace(/([^:]\/)\/+/g, "$1");
    console.log('Checking LLM connection via proxy at:', url);
    
    // Use a GET request for health check
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Only wait for 5 seconds max
      signal: AbortSignal.timeout(5000)
    });
    
    console.log('LLM service check response:', response.status);
    const isReachable = response.ok;
    
    if (isReachable) {
      console.log('✅ LLM service is reachable via proxy');
    } else {
      console.error('❌ LLM service returned error:', response.status, response.statusText);
    }
    
    return isReachable;
  } catch (error) {
    console.error('LLM service connection check failed:', error);
    return false;
  }
};

/**
 * Logs network configuration information
 */
export const logNetworkInfo = async () => {
  console.log('Network Configuration:');
  console.log(`Main API URL: ${MAIN_API_BASE_URL}`);
  console.log(`LLM API URL: ${LLM_API_BASE_URL}`);
  
  // Check if we can reach the main server
  const isMainServerReachable = await checkServerConnection();
  if (isMainServerReachable) {
    console.log('✅ Main server is reachable');
  } else {
    console.error('❌ Main server is not reachable');
  }
  
  // Check if we can reach the LLM service
  const isLlmServiceReachable = await checkLlmServiceConnection();
  if (isLlmServiceReachable) {
    console.log('✅ LLM service is reachable');
  } else {
    console.error('❌ LLM service is not reachable');
  }
  
  return {
    mainServerReachable: isMainServerReachable,
    llmServiceReachable: isLlmServiceReachable
  };
};

/**
 * Gets a full API URL for a given endpoint
 * @param {string} endpoint - The API endpoint (without leading slash)
 * @returns {string} The full URL
 */
export const getFullApiUrl = (endpoint) => {
  const path = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  return `${MAIN_API_BASE_URL}/api/${path}`;
};

/**
 * Gets a full LLM API URL for a given endpoint
 * @param {string} endpoint - The LLM API endpoint (without leading slash)
 * @returns {string} The full URL
 */
export const getFullLlmApiUrl = (endpoint) => {
  const path = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const url = `${LLM_API_BASE_URL}/api/${path}`;
  // Replace any double slashes (except after protocol)
  return url.replace(/([^:]\/)\/+/g, "$1");
};

export default {
  checkServerConnection,
  checkLlmServiceConnection,
  logNetworkInfo,
  getFullApiUrl,
  getFullLlmApiUrl
}; 