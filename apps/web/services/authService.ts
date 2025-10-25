import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, RegisterData } from '../types';
import { API_BASE_URL } from '../constants/api';

class AuthService {
  private baseURL = `${API_BASE_URL}/auth`;

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      const response = await axios.post(`${this.baseURL}/login`, {
        email,
        password,
      });

      const { user, token } = response.data;
      return { user, token };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(userData: RegisterData): Promise<{ user: User; token: string }> {
    try {
      const response = await axios.post(`${this.baseURL}/register`, userData);
      const { user, token } = response.data;
      return { user, token };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        await axios.post(`${this.baseURL}/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${this.baseURL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return response.data.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.put(`${this.baseURL}/me`, userData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return response.data.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/forgot-password`, { email });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/reset-password`, { token, password });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/verify-email`, { token });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/resend-verification`, { email });
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

export const authService = new AuthService();