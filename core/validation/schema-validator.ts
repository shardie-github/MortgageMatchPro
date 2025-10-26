/**
 * Schema Validation System - MortgageMatchPro v1.4.0
 * 
 * Comprehensive schema validation for data integrity and type safety
 * Supports JSON Schema, Zod, and custom validation rules
 */

import { z } from 'zod';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

// Core validation schemas
export const MortgageCalculationSchema = z.object({
  income: z.number().positive('Income must be positive'),
  monthlyDebts: z.number().min(0, 'Monthly debts cannot be negative'),
  downPayment: z.number().min(0, 'Down payment cannot be negative'),
  propertyValue: z.number().positive('Property value must be positive'),
  creditScore: z.number().min(300).max(850, 'Credit score must be between 300-850'),
  loanTerm: z.number().min(1).max(50, 'Loan term must be between 1-50 years'),
  interestRate: z.number().min(0).max(50, 'Interest rate must be between 0-50%'),
  propertyType: z.enum(['single_family', 'condo', 'townhouse', 'multi_family']),
  occupancyType: z.enum(['primary', 'secondary', 'investment']),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
    country: z.string().min(2, 'Country is required')
  })
});

export const UserProfileSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  employmentStatus: z.enum(['employed', 'self_employed', 'unemployed', 'retired']),
  annualIncome: z.number().positive('Annual income must be positive'),
  creditScore: z.number().min(300).max(850, 'Credit score must be between 300-850'),
  preferences: z.object({
    loanType: z.enum(['conventional', 'fha', 'va', 'usda']),
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
    communicationPreference: z.enum(['email', 'phone', 'sms']),
    marketingOptIn: z.boolean()
  }).optional(),
  createdAt: z.string().datetime('Invalid creation date'),
  updatedAt: z.string().datetime('Invalid update date')
});

export const RateComparisonSchema = z.object({
  lenderId: z.string().min(1, 'Lender ID is required'),
  lenderName: z.string().min(1, 'Lender name is required'),
  rate: z.number().min(0).max(50, 'Rate must be between 0-50%'),
  apr: z.number().min(0).max(50, 'APR must be between 0-50%'),
  points: z.number().min(0, 'Points cannot be negative'),
  fees: z.number().min(0, 'Fees cannot be negative'),
  closingCosts: z.number().min(0, 'Closing costs cannot be negative'),
  monthlyPayment: z.number().positive('Monthly payment must be positive'),
  totalInterest: z.number().min(0, 'Total interest cannot be negative'),
  loanAmount: z.number().positive('Loan amount must be positive'),
  loanTerm: z.number().min(1).max(50, 'Loan term must be between 1-50 years'),
  productType: z.enum(['fixed', 'arm_5_1', 'arm_7_1', 'arm_10_1']),
  isConforming: z.boolean(),
  isJumbo: z.boolean(),
  lastUpdated: z.string().datetime('Invalid last updated date')
});

export const LeadDataSchema = z.object({
  id: z.string().uuid('Invalid lead ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  propertyAddress: z.string().min(1, 'Property address is required'),
  loanAmount: z.number().positive('Loan amount must be positive'),
  downPayment: z.number().min(0, 'Down payment cannot be negative'),
  creditScore: z.number().min(300).max(850, 'Credit score must be between 300-850'),
  annualIncome: z.number().positive('Annual income must be positive'),
  monthlyDebts: z.number().min(0, 'Monthly debts cannot be negative'),
  loanPurpose: z.enum(['purchase', 'refinance', 'cash_out_refinance', 'home_equity']),
  propertyType: z.enum(['single_family', 'condo', 'townhouse', 'multi_family']),
  occupancyType: z.enum(['primary', 'secondary', 'investment']),
  preferredLenders: z.array(z.string()).optional(),
  contactPreference: z.enum(['email', 'phone', 'sms']),
  urgency: z.enum(['immediate', 'within_week', 'within_month', 'exploring']),
  notes: z.string().max(1000, 'Notes too long').optional(),
  createdAt: z.string().datetime('Invalid creation date'),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'closed'])
});

// JSON Schema definitions for API validation
export const MortgageCalculationJSONSchema = {
  type: 'object',
  required: ['income', 'monthlyDebts', 'downPayment', 'propertyValue', 'creditScore', 'loanTerm', 'interestRate', 'propertyType', 'occupancyType', 'location'],
  properties: {
    income: { type: 'number', minimum: 0 },
    monthlyDebts: { type: 'number', minimum: 0 },
    downPayment: { type: 'number', minimum: 0 },
    propertyValue: { type: 'number', minimum: 0 },
    creditScore: { type: 'number', minimum: 300, maximum: 850 },
    loanTerm: { type: 'number', minimum: 1, maximum: 50 },
    interestRate: { type: 'number', minimum: 0, maximum: 50 },
    propertyType: { type: 'string', enum: ['single_family', 'condo', 'townhouse', 'multi_family'] },
    occupancyType: { type: 'string', enum: ['primary', 'secondary', 'investment'] },
    location: {
      type: 'object',
      required: ['address', 'city', 'state', 'zipCode', 'country'],
      properties: {
        address: { type: 'string', minLength: 1 },
        city: { type: 'string', minLength: 1 },
        state: { type: 'string', minLength: 2 },
        zipCode: { type: 'string', pattern: '^\\d{5}(-\\d{4})?$' },
        country: { type: 'string', minLength: 2 }
      }
    }
  }
};

export const UserProfileJSONSchema = {
  type: 'object',
  required: ['id', 'email', 'firstName', 'lastName', 'phone', 'dateOfBirth', 'employmentStatus', 'annualIncome', 'creditScore', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    firstName: { type: 'string', minLength: 1, maxLength: 50 },
    lastName: { type: 'string', minLength: 1, maxLength: 50 },
    phone: { type: 'string', pattern: '^\\+?[\\d\\s\\-\\(\\)]+$' },
    dateOfBirth: { type: 'string', format: 'date' },
    employmentStatus: { type: 'string', enum: ['employed', 'self_employed', 'unemployed', 'retired'] },
    annualIncome: { type: 'number', minimum: 0 },
    creditScore: { type: 'number', minimum: 300, maximum: 850 },
    preferences: {
      type: 'object',
      properties: {
        loanType: { type: 'string', enum: ['conventional', 'fha', 'va', 'usda'] },
        riskTolerance: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'] },
        communicationPreference: { type: 'string', enum: ['email', 'phone', 'sms'] },
        marketingOptIn: { type: 'boolean' }
      }
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  data?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
  path?: string[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
  path?: string[];
}

// Schema validator class
export class SchemaValidator {
  private ajv: Ajv;
  private schemas: Map<string, any> = new Map();

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.registerSchemas();
  }

  private registerSchemas(): void {
    // Register JSON schemas
    this.ajv.addSchema(MortgageCalculationJSONSchema, 'mortgage-calculation');
    this.ajv.addSchema(UserProfileJSONSchema, 'user-profile');
    
    // Register Zod schemas
    this.schemas.set('mortgage-calculation', MortgageCalculationSchema);
    this.schemas.set('user-profile', UserProfileSchema);
    this.schemas.set('rate-comparison', RateComparisonSchema);
    this.schemas.set('lead-data', LeadDataSchema);
  }

  /**
   * Validate data using Zod schema
   */
  validateZod<T>(schemaName: string, data: any): ValidationResult {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return {
        isValid: false,
        errors: [{
          field: 'schema',
          message: `Schema '${schemaName}' not found`,
          code: 'SCHEMA_NOT_FOUND'
        }],
        warnings: []
      };
    }

    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return {
          isValid: true,
          errors: [],
          warnings: [],
          data: result.data
        };
      } else {
        const errors: ValidationError[] = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code || 'VALIDATION_ERROR',
          value: err.input,
          path: err.path
        }));

        return {
          isValid: false,
          errors,
          warnings: []
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'validation',
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'VALIDATION_EXCEPTION'
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate data using JSON Schema
   */
  validateJSON(schemaName: string, data: any): ValidationResult {
    const validate = this.ajv.getSchema(schemaName);
    if (!validate) {
      return {
        isValid: false,
        errors: [{
          field: 'schema',
          message: `JSON Schema '${schemaName}' not found`,
          code: 'SCHEMA_NOT_FOUND'
        }],
        warnings: []
      };
    }

    const valid = validate(data);
    
    if (valid) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        data
      };
    } else {
      const errors: ValidationError[] = validate.errors?.map(err => ({
        field: err.instancePath || err.schemaPath || 'root',
        message: err.message || 'Validation error',
        code: err.keyword || 'VALIDATION_ERROR',
        value: err.data,
        path: err.instancePath?.split('/').filter(Boolean) || []
      })) || [];

      return {
        isValid: false,
        errors,
        warnings: []
      };
    }
  }

  /**
   * Validate with custom business rules
   */
  validateBusinessRules(data: any, rules: BusinessRule[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const rule of rules) {
      try {
        const result = rule.validate(data);
        if (!result.isValid) {
          if (rule.severity === 'error') {
            errors.push(...result.errors);
          } else {
            warnings.push(...result.errors.map(err => ({
              field: err.field,
              message: err.message,
              code: err.code,
              value: err.value,
              path: err.path
            })));
          }
        }
      } catch (error) {
        errors.push({
          field: rule.field,
          message: `Rule validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'RULE_VALIDATION_ERROR'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data
    };
  }

  /**
   * Get schema information
   */
  getSchemaInfo(schemaName: string): any {
    const zodSchema = this.schemas.get(schemaName);
    const jsonSchema = this.ajv.getSchema(schemaName);
    
    return {
      name: schemaName,
      hasZod: !!zodSchema,
      hasJSON: !!jsonSchema,
      zodShape: zodSchema?._def?.shape || null,
      jsonSchema: jsonSchema?.schema || null
    };
  }

  /**
   * List all available schemas
   */
  listSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }
}

// Business rule interface
export interface BusinessRule {
  field: string;
  name: string;
  description: string;
  severity: 'error' | 'warning';
  validate: (data: any) => ValidationResult;
}

// Common business rules
export const BusinessRules = {
  /**
   * Validate debt-to-income ratio
   */
  debtToIncomeRatio: (maxRatio: number = 0.43): BusinessRule => ({
    field: 'debtToIncomeRatio',
    name: 'Debt-to-Income Ratio',
    description: `Debt-to-income ratio must not exceed ${maxRatio * 100}%`,
    severity: 'error',
    validate: (data: any) => {
      const { income, monthlyDebts, propertyValue, downPayment, interestRate, loanTerm } = data;
      
      if (!income || !monthlyDebts || !propertyValue || !downPayment || !interestRate || !loanTerm) {
        return {
          isValid: true,
          errors: [],
          warnings: []
        };
      }

      const loanAmount = propertyValue - downPayment;
      const monthlyRate = interestRate / 100 / 12;
      const numPayments = loanTerm * 12;
      const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
      
      const totalMonthlyDebts = monthlyDebts + monthlyPayment;
      const dti = totalMonthlyDebts / (income / 12);
      
      if (dti > maxRatio) {
        return {
          isValid: false,
          errors: [{
            field: 'debtToIncomeRatio',
            message: `Debt-to-income ratio ${(dti * 100).toFixed(1)}% exceeds maximum ${maxRatio * 100}%`,
            code: 'DTI_TOO_HIGH',
            value: dti
          }],
          warnings: []
        };
      }

      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    }
  }),

  /**
   * Validate loan-to-value ratio
   */
  loanToValueRatio: (maxRatio: number = 0.95): BusinessRule => ({
    field: 'loanToValueRatio',
    name: 'Loan-to-Value Ratio',
    description: `Loan-to-value ratio must not exceed ${maxRatio * 100}%`,
    severity: 'error',
    validate: (data: any) => {
      const { propertyValue, downPayment } = data;
      
      if (!propertyValue || !downPayment) {
        return {
          isValid: true,
          errors: [],
          warnings: []
        };
      }

      const ltv = (propertyValue - downPayment) / propertyValue;
      
      if (ltv > maxRatio) {
        return {
          isValid: false,
          errors: [{
            field: 'loanToValueRatio',
            message: `Loan-to-value ratio ${(ltv * 100).toFixed(1)}% exceeds maximum ${maxRatio * 100}%`,
            code: 'LTV_TOO_HIGH',
            value: ltv
          }],
          warnings: []
        };
      }

      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    }
  }),

  /**
   * Validate minimum down payment
   */
  minimumDownPayment: (minPercentage: number = 0.05): BusinessRule => ({
    field: 'minimumDownPayment',
    name: 'Minimum Down Payment',
    description: `Down payment must be at least ${minPercentage * 100}% of property value`,
    severity: 'error',
    validate: (data: any) => {
      const { propertyValue, downPayment } = data;
      
      if (!propertyValue || !downPayment) {
        return {
          isValid: true,
          errors: [],
          warnings: []
        };
      }

      const downPaymentPercentage = downPayment / propertyValue;
      
      if (downPaymentPercentage < minPercentage) {
        return {
          isValid: false,
          errors: [{
            field: 'minimumDownPayment',
            message: `Down payment ${(downPaymentPercentage * 100).toFixed(1)}% is below minimum ${minPercentage * 100}%`,
            code: 'DOWN_PAYMENT_TOO_LOW',
            value: downPaymentPercentage
          }],
          warnings: []
        };
      }

      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    }
  })
};

// Export singleton instance
export const schemaValidator = new SchemaValidator();

// Export validation utilities
export const validateMortgageCalculation = (data: any) => 
  schemaValidator.validateZod('mortgage-calculation', data);

export const validateUserProfile = (data: any) => 
  schemaValidator.validateZod('user-profile', data);

export const validateRateComparison = (data: any) => 
  schemaValidator.validateZod('rate-comparison', data);

export const validateLeadData = (data: any) => 
  schemaValidator.validateZod('lead-data', data);