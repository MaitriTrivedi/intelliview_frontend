import { API_BASE_URL } from '../config/api';
import { MAIN_API_BASE_URL, LLM_API_BASE_URL, getLlmApiBaseUrl } from '../config/environment';

// Get the LLM service URL
const LLM_API_URL = getLlmApiBaseUrl();

const networkUtils = {
  async checkMainServerConnection() {
    try {
      const response = await fetch('/api/health/');
      return response.ok;
    } catch (error) {
      console.error('Error checking main server connection:', error);
      return false;
    }
  },

  async checkLlmServiceConnection() {
    try {
      const llmUrl = getLlmApiBaseUrl();
      const response = await fetch(`${llmUrl}/health/`);
      return response.ok;
    } catch (error) {
      console.error('Error checking LLM service connection:', error);
      return false;
    }
  },

  async logNetworkInfo() {
    const mainServerReachable = await this.checkMainServerConnection();
    const llmServiceReachable = await this.checkLlmServiceConnection();

    console.log('Network Status:', {
      mainServerReachable,
      llmServiceReachable
    });

    return {
      mainServerReachable,
      llmServiceReachable
    };
  }
};

export default networkUtils; 