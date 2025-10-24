import { apiClient } from './apiClient';
import { MortgageData, MortgageCalculation } from '../../types/mortgage';

export const mortgageApi = {
  // Get current mortgage rates
  getRates: async (params: {
    loanAmount: number;
    creditScore: number;
    propertyType: string;
    location: string;
  }) => {
    const response = await apiClient.get('/rates', { params });
    return response.data;
  },

  // Calculate mortgage payment
  calculatePayment: async (data: MortgageData): Promise<MortgageCalculation> => {
    const response = await apiClient.post('/calculate', data);
    return response.data;
  },

  // Get lender recommendations
  getLenderRecommendations: async (params: {
    loanAmount: number;
    creditScore: number;
    propertyType: string;
    location: string;
  }) => {
    const response = await apiClient.get('/lenders', { params });
    return response.data;
  },

  // Submit mortgage application
  submitApplication: async (data: {
    personalInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      ssn: string;
    };
    mortgageData: MortgageData;
    documents: string[];
  }) => {
    const response = await apiClient.post('/applications', data);
    return response.data;
  },

  // Get application status
  getApplicationStatus: async (applicationId: string) => {
    const response = await apiClient.get(`/applications/${applicationId}`);
    return response.data;
  },

  // Get user's applications
  getUserApplications: async () => {
    const response = await apiClient.get('/applications');
    return response.data;
  },

  // Get market insights
  getMarketInsights: async (location: string) => {
    const response = await apiClient.get('/market-insights', { params: { location } });
    return response.data;
  },
};