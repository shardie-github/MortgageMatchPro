// API Configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://api.mortgagematchpro.com';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    ME: '/auth/me',
  },
  
  // Mortgage Services
  MORTGAGE: {
    CALCULATE_AFFORDABILITY: '/mortgage/calculate-affordability',
    RATES: '/mortgage/rates',
    LENDERS: '/mortgage/lenders',
    CONTACT_LENDER: '/mortgage/contact-lender',
    SCENARIOS: '/mortgage/scenarios',
    COMPARE_SCENARIOS: '/mortgage/scenarios/compare',
    LEADS: '/mortgage/leads',
    DOCUMENTS: '/mortgage/documents',
    UPLOAD_DOCUMENT: '/mortgage/documents/upload',
    PROCESS_DOCUMENT: '/mortgage/documents/process',
  },
  
  // Analytics
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    BROKER: '/analytics/broker',
    REPORTS: '/analytics/reports',
    EXPORT: '/analytics/export',
  },
  
  // Broker Services
  BROKER: {
    DASHBOARD: '/broker/dashboard',
    LEADS: '/broker/leads',
    COMMISSIONS: '/broker/commissions',
    PERFORMANCE: '/broker/performance',
    SETTINGS: '/broker/settings',
  },
  
  // Document Services
  DOCUMENTS: {
    UPLOAD: '/documents/upload',
    PROCESS: '/documents/process',
    EXTRACT: '/documents/extract',
    DOWNLOAD: '/documents/download',
  },
  
  // Integration Services
  INTEGRATIONS: {
    LENDERS: '/integrations/lenders',
    CREDIT_BUREAU: '/integrations/credit-bureau',
    PROPERTY_DATA: '/integrations/property-data',
    INSURANCE: '/integrations/insurance',
  },
};

// Request Configuration
export const REQUEST_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// API Headers
export const getDefaultHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
});

export const getAuthHeaders = async (token?: string) => {
  const authToken = token || await AsyncStorage.getItem('authToken');
  return {
    ...getDefaultHeaders(),
    'Authorization': `Bearer ${authToken}`,
  };
};