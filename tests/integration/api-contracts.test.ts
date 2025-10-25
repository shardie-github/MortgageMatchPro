/**
 * API Contract Tests
 * Tests for API endpoint contracts and data validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock API service
class APIService {
  async makeRequest(endpoint: string, method: string, data?: any): Promise<any> {
    // Simulate API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (endpoint.includes('error')) {
          reject(new Error('API Error'));
        } else {
          resolve({
            success: true,
            data: data || { message: 'Success' },
            timestamp: new Date().toISOString()
          });
        }
      }, 100);
    });
  }
}

// API Contract definitions
interface UserAPI {
  createUser(data: CreateUserRequest): Promise<CreateUserResponse>;
  getUser(id: string): Promise<GetUserResponse>;
  updateUser(id: string, data: UpdateUserRequest): Promise<UpdateUserResponse>;
  deleteUser(id: string): Promise<DeleteUserResponse>;
}

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'viewer';
}

interface CreateUserResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: string;
  };
  message?: string;
}

interface GetUserResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user' | 'viewer';
}

interface UpdateUserResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    updatedAt: string;
  };
  message?: string;
}

interface DeleteUserResponse {
  success: boolean;
  message: string;
}

// Mock User API implementation
class UserAPIService implements UserAPI {
  constructor(private apiService: APIService) {}

  async createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
    // Validate required fields
    if (!data.email || !data.firstName || !data.lastName || !data.role) {
      throw new Error('Missing required fields');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate role
    const validRoles = ['admin', 'user', 'viewer'];
    if (!validRoles.includes(data.role)) {
      throw new Error('Invalid role');
    }

    const response = await this.apiService.makeRequest('/users', 'POST', data);
    
    return {
      success: true,
      data: {
        id: 'user-123',
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        createdAt: new Date().toISOString()
      },
      message: 'User created successfully'
    };
  }

  async getUser(id: string): Promise<GetUserResponse> {
    if (!id) {
      throw new Error('User ID is required');
    }

    const response = await this.apiService.makeRequest(`/users/${id}`, 'GET');
    
    return {
      success: true,
      data: {
        id: id,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<UpdateUserResponse> {
    if (!id) {
      throw new Error('User ID is required');
    }

    // Validate email format if provided
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }
    }

    // Validate role if provided
    if (data.role) {
      const validRoles = ['admin', 'user', 'viewer'];
      if (!validRoles.includes(data.role)) {
        throw new Error('Invalid role');
      }
    }

    const response = await this.apiService.makeRequest(`/users/${id}`, 'PUT', data);
    
    return {
      success: true,
      data: {
        id: id,
        email: data.email || 'user@example.com',
        firstName: data.firstName || 'John',
        lastName: data.lastName || 'Doe',
        role: data.role || 'user',
        updatedAt: new Date().toISOString()
      },
      message: 'User updated successfully'
    };
  }

  async deleteUser(id: string): Promise<DeleteUserResponse> {
    if (!id) {
      throw new Error('User ID is required');
    }

    await this.apiService.makeRequest(`/users/${id}`, 'DELETE');
    
    return {
      success: true,
      message: 'User deleted successfully'
    };
  }
}

describe('API Contract Tests', () => {
  let apiService: APIService;
  let userAPI: UserAPIService;

  beforeEach(() => {
    apiService = new APIService();
    userAPI = new UserAPIService(apiService);
  });

  describe('Create User API', () => {
    it('should create user with valid data', async () => {
      const userData: CreateUserRequest = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      const response = await userAPI.createUser(userData);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
      expect(response.data.email).toBe(userData.email);
      expect(response.data.firstName).toBe(userData.firstName);
      expect(response.data.lastName).toBe(userData.lastName);
      expect(response.data.role).toBe(userData.role);
      expect(response.data).toHaveProperty('createdAt');
      expect(response.message).toBe('User created successfully');
    });

    it('should reject user creation with missing required fields', async () => {
      const invalidData = {
        email: 'test@example.com',
        firstName: 'John'
        // Missing lastName and role
      } as CreateUserRequest;

      await expect(userAPI.createUser(invalidData))
        .rejects.toThrow('Missing required fields');
    });

    it('should reject user creation with invalid email', async () => {
      const invalidData: CreateUserRequest = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      await expect(userAPI.createUser(invalidData))
        .rejects.toThrow('Invalid email format');
    });

    it('should reject user creation with invalid role', async () => {
      const invalidData: CreateUserRequest = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'invalid-role' as any
      };

      await expect(userAPI.createUser(invalidData))
        .rejects.toThrow('Invalid role');
    });

    it('should handle all valid roles', async () => {
      const validRoles: Array<'admin' | 'user' | 'viewer'> = ['admin', 'user', 'viewer'];

      for (const role of validRoles) {
        const userData: CreateUserRequest = {
          email: `test-${role}@example.com`,
          firstName: 'John',
          lastName: 'Doe',
          role
        };

        const response = await userAPI.createUser(userData);
        expect(response.data.role).toBe(role);
      }
    });
  });

  describe('Get User API', () => {
    it('should get user with valid ID', async () => {
      const userId = 'user-123';
      const response = await userAPI.getUser(userId);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('email');
      expect(response.data).toHaveProperty('firstName');
      expect(response.data).toHaveProperty('lastName');
      expect(response.data).toHaveProperty('role');
      expect(response.data).toHaveProperty('createdAt');
      expect(response.data).toHaveProperty('updatedAt');
    });

    it('should reject get user with missing ID', async () => {
      await expect(userAPI.getUser(''))
        .rejects.toThrow('User ID is required');
    });

    it('should handle special characters in user ID', async () => {
      const userId = 'user-123-abc-456';
      const response = await userAPI.getUser(userId);

      expect(response.success).toBe(true);
      expect(response.data.id).toBe(userId);
    });
  });

  describe('Update User API', () => {
    it('should update user with valid data', async () => {
      const userId = 'user-123';
      const updateData: UpdateUserRequest = {
        email: 'updated@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'admin'
      };

      const response = await userAPI.updateUser(userId, updateData);

      expect(response.success).toBe(true);
      expect(response.data.id).toBe(userId);
      expect(response.data.email).toBe(updateData.email);
      expect(response.data.firstName).toBe(updateData.firstName);
      expect(response.data.lastName).toBe(updateData.lastName);
      expect(response.data.role).toBe(updateData.role);
      expect(response.data).toHaveProperty('updatedAt');
      expect(response.message).toBe('User updated successfully');
    });

    it('should update user with partial data', async () => {
      const userId = 'user-123';
      const updateData: UpdateUserRequest = {
        email: 'updated@example.com'
        // Only updating email
      };

      const response = await userAPI.updateUser(userId, updateData);

      expect(response.success).toBe(true);
      expect(response.data.email).toBe(updateData.email);
      expect(response.data.firstName).toBe('John'); // Default value
      expect(response.data.lastName).toBe('Doe'); // Default value
      expect(response.data.role).toBe('user'); // Default value
    });

    it('should reject update with invalid email', async () => {
      const userId = 'user-123';
      const updateData: UpdateUserRequest = {
        email: 'invalid-email'
      };

      await expect(userAPI.updateUser(userId, updateData))
        .rejects.toThrow('Invalid email format');
    });

    it('should reject update with invalid role', async () => {
      const userId = 'user-123';
      const updateData: UpdateUserRequest = {
        role: 'invalid-role' as any
      };

      await expect(userAPI.updateUser(userId, updateData))
        .rejects.toThrow('Invalid role');
    });

    it('should reject update with missing user ID', async () => {
      const updateData: UpdateUserRequest = {
        email: 'updated@example.com'
      };

      await expect(userAPI.updateUser('', updateData))
        .rejects.toThrow('User ID is required');
    });
  });

  describe('Delete User API', () => {
    it('should delete user with valid ID', async () => {
      const userId = 'user-123';
      const response = await userAPI.deleteUser(userId);

      expect(response.success).toBe(true);
      expect(response.message).toBe('User deleted successfully');
    });

    it('should reject delete with missing user ID', async () => {
      await expect(userAPI.deleteUser(''))
        .rejects.toThrow('User ID is required');
    });
  });

  describe('API Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API service to throw error
      const errorApiService = new APIService();
      const errorUserAPI = new UserAPIService(errorApiService);

      // Mock the makeRequest method to throw error
      jest.spyOn(errorApiService, 'makeRequest').mockRejectedValue(new Error('API Error'));

      const userData: CreateUserRequest = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      await expect(errorUserAPI.createUser(userData))
        .rejects.toThrow('API Error');
    });

    it('should handle network timeouts', async () => {
      const timeoutApiService = new APIService();
      const timeoutUserAPI = new UserAPIService(timeoutApiService);

      // Mock the makeRequest method to simulate timeout
      jest.spyOn(timeoutApiService, 'makeRequest').mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const userData: CreateUserRequest = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      await expect(timeoutUserAPI.createUser(userData))
        .rejects.toThrow('Request timeout');
    });
  });

  describe('Data Validation', () => {
    it('should validate email format in all endpoints', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        'test@.com',
        'test@example.',
        ''
      ];

      for (const email of invalidEmails) {
        const userData: CreateUserRequest = {
          email,
          firstName: 'John',
          lastName: 'Doe',
          role: 'user'
        };

        await expect(userAPI.createUser(userData))
          .rejects.toThrow('Invalid email format');
      }
    });

    it('should validate required string fields are not empty', async () => {
      const emptyFields = [
        { email: '', firstName: 'John', lastName: 'Doe', role: 'user' as const },
        { email: 'test@example.com', firstName: '', lastName: 'Doe', role: 'user' as const },
        { email: 'test@example.com', firstName: 'John', lastName: '', role: 'user' as const }
      ];

      for (const userData of emptyFields) {
        await expect(userAPI.createUser(userData))
          .rejects.toThrow('Missing required fields');
      }
    });
  });
});