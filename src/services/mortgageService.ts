import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  AffordabilityInput, 
  AffordabilityResult, 
  RateResult, 
  ScenarioInput, 
  ScenarioResult, 
  ScenarioComparison,
  Lead,
  LeadData,
  Document,
  Lender
} from '../types';
import { API_BASE_URL } from '../constants/api';

class MortgageService {
  private baseURL = `${API_BASE_URL}/mortgage`;

  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Affordability Calculations
  async calculateAffordability(input: AffordabilityInput): Promise<AffordabilityResult> {
    try {
      const response = await axios.post(`${this.baseURL}/calculate-affordability`, input, {
        headers: await this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Rate Management
  async getRates(params: {
    country: 'CA' | 'US';
    termYears: number;
    rateType: 'fixed' | 'variable' | 'arm';
    propertyPrice: number;
    downPayment: number;
    location?: string;
  }): Promise<RateResult[]> {
    try {
      const response = await axios.get(`${this.baseURL}/rates`, {
        params,
        headers: await this.getAuthHeaders(),
      });
      return response.data.rates;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getLenders(): Promise<Lender[]> {
    try {
      const response = await axios.get(`${this.baseURL}/lenders`, {
        headers: await this.getAuthHeaders(),
      });
      return response.data.lenders;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async contactLender(lenderId: string, leadData: LeadData): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/contact-lender`, {
        lenderId,
        leadData,
      }, {
        headers: await this.getAuthHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Scenario Analysis
  async createScenario(scenario: ScenarioInput): Promise<ScenarioResult> {
    try {
      const response = await axios.post(`${this.baseURL}/scenarios`, scenario, {
        headers: await this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getScenarios(): Promise<ScenarioResult[]> {
    try {
      const response = await axios.get(`${this.baseURL}/scenarios`, {
        headers: await this.getAuthHeaders(),
      });
      return response.data.scenarios;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async compareScenarios(scenarioIds: string[]): Promise<ScenarioComparison> {
    try {
      const response = await axios.post(`${this.baseURL}/scenarios/compare`, {
        scenarioIds,
      }, {
        headers: await this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteScenario(scenarioId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseURL}/scenarios/${scenarioId}`, {
        headers: await this.getAuthHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Lead Management
  async createLead(leadData: LeadData): Promise<Lead> {
    try {
      const response = await axios.post(`${this.baseURL}/leads`, leadData, {
        headers: await this.getAuthHeaders(),
      });
      return response.data.lead;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getLeads(): Promise<Lead[]> {
    try {
      const response = await axios.get(`${this.baseURL}/leads`, {
        headers: await this.getAuthHeaders(),
      });
      return response.data.leads;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateLeadStatus(leadId: string, status: string): Promise<Lead> {
    try {
      const response = await axios.put(`${this.baseURL}/leads/${leadId}/status`, {
        status,
      }, {
        headers: await this.getAuthHeaders(),
      });
      return response.data.lead;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addLeadNote(leadId: string, content: string, isInternal: boolean = false): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/leads/${leadId}/notes`, {
        content,
        isInternal,
      }, {
        headers: await this.getAuthHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Document Management
  async uploadDocument(
    file: any,
    category: string,
    leadId?: string
  ): Promise<Document> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (leadId) {
        formData.append('leadId', leadId);
      }

      const response = await axios.post(`${this.baseURL}/documents/upload`, formData, {
        headers: {
          ...await this.getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.document;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getDocuments(leadId?: string): Promise<Document[]> {
    try {
      const params = leadId ? { leadId } : {};
      const response = await axios.get(`${this.baseURL}/documents`, {
        params,
        headers: await this.getAuthHeaders(),
      });
      return response.data.documents;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseURL}/documents/${documentId}`, {
        headers: await this.getAuthHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async processDocument(documentId: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseURL}/documents/${documentId}/process`, {}, {
        headers: await this.getAuthHeaders(),
      });
      return response.data.extractedData;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Analytics
  async getDashboardMetrics(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/analytics/dashboard`, {
        headers: await this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBrokerMetrics(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/analytics/broker`, {
        headers: await this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred';
      return new Error(message);
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    } else {
      return new Error('An unexpected error occurred');
    }
  }
}

export const mortgageService = new MortgageService();