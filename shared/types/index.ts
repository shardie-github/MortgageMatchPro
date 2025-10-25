// Shared TypeScript types and interfaces
// This file exports all shared types used across the application

// Common types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User types
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer'
}

// Tenant types
export interface Tenant extends BaseEntity {
  name: string;
  domain: string;
  settings: TenantSettings;
  isActive: boolean;
}

export interface TenantSettings {
  features: string[];
  limits: {
    maxUsers: number;
    maxScenarios: number;
    maxApiCalls: number;
  };
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

// AI types
export interface AIRequest {
  prompt: string;
  context: Record<string, any>;
  options?: AIRequestOptions;
}

export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeout?: number;
}

export interface AIResponse {
  content: string;
  confidence: number;
  model: string;
  tokens: number;
  latency: number;
}

// Billing types
export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    maxUsers: number;
    maxScenarios: number;
    maxApiCalls: number;
  };
}

export interface Subscription extends BaseEntity {
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid'
}

// Error types
export interface AppError extends Error {
  code: string;
  statusCode: number;
  context?: Record<string, any>;
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}