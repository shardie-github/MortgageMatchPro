import axios from 'axios';
import { Platform } from 'react-native';
import Config from 'react-native-config';

const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'ios' 
    ? 'http://localhost:3000/api' 
    : 'http://10.0.2.2:3000/api'
  : Config.API_BASE_URL || 'https://your-api-domain.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      clearAuthToken();
    }
    return Promise.reject(error);
  }
);

// Helper functions for token management
const getAuthToken = (): string | null => {
  // TODO: Implement token retrieval from secure storage (Keychain/Keystore)
  // For now, return null - this should be implemented with react-native-keychain
  return null;
};

const clearAuthToken = (): void => {
  // TODO: Implement token clearing from secure storage
  // This should clear tokens from Keychain/Keystore
};