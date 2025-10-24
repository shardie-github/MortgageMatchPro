// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  subscriptionTier: 'free' | 'premium' | 'broker';
  avatar?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  language: string;
  currency: 'CAD' | 'USD';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
}

// Mortgage Calculation Types
export interface AffordabilityInput {
  country: 'CA' | 'US';
  income: number;
  debts: number;
  downPayment: number;
  propertyPrice: number;
  interestRate: number;
  termYears: number;
  location: string;
  taxes?: number;
  insurance?: number;
  hoa?: number;
  pmi?: number;
}

export interface AffordabilityResult {
  maxAffordable: number;
  monthlyPayment: number;
  gdsRatio: number;
  tdsRatio: number;
  qualificationResult: boolean;
  breakdown: {
    principal: number;
    interest: number;
    taxes: number;
    insurance: number;
    pmi: number;
  };
  recommendations: string[];
  riskFactors: RiskFactor[];
  compliance: ComplianceInfo;
}

export interface RiskFactor {
  type: 'rate_risk' | 'payment_shock' | 'qualification_risk' | 'market_risk';
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation?: string;
}

export interface ComplianceInfo {
  osfiCompliant: boolean;
  cfpbCompliant: boolean;
  stressTestPassed: boolean;
  warnings: string[];
}

// Rate and Lender Types
export interface RateResult {
  id: string;
  lenderId: string;
  lenderName: string;
  lenderLogo: string;
  rate: number;
  rateType: 'fixed' | 'variable' | 'arm';
  termYears: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  features: string[];
  requirements: string[];
  contactInfo: ContactInfo;
  lastUpdated: string;
  expiresAt: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  website: string;
  address: string;
}

export interface Lender {
  id: string;
  name: string;
  logo: string;
  description: string;
  specialties: string[];
  regions: string[];
  contactInfo: ContactInfo;
  rating: number;
  reviewCount: number;
  isActive: boolean;
}

// Scenario Analysis Types
export interface ScenarioInput {
  id: string;
  name: string;
  description?: string;
  parameters: AffordabilityInput;
  metadata: {
    createdAt: string;
    updatedAt: string;
    userId?: string;
    isTemplate: boolean;
    tags: string[];
  };
}

export interface ScenarioResult {
  scenarioId: string;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  breakEvenPoint?: number;
  gdsRatio: number;
  tdsRatio: number;
  dtiRatio: number;
  qualificationResult: boolean;
  amortizationSchedule: AmortizationEntry[];
  riskFactors: RiskFactor[];
  compliance: ComplianceInfo;
}

export interface AmortizationEntry {
  month: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface ScenarioComparison {
  id: string;
  name: string;
  scenarios: ScenarioResult[];
  comparison: {
    bestOption: string;
    worstOption: string;
    savings: number;
    riskAssessment: {
      lowestRisk: string;
      highestRisk: string;
      overallRisk: 'low' | 'medium' | 'high';
    };
    recommendations: Recommendation[];
  };
  aiInsights: AIInsights;
  metadata: {
    createdAt: string;
    updatedAt: string;
    userId?: string;
    isShared: boolean;
    shareToken?: string;
  };
}

export interface Recommendation {
  type: 'optimization' | 'risk_mitigation' | 'compliance' | 'financial';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action?: string;
}

export interface AIInsights {
  summary: string;
  pros: string[];
  cons: string[];
  nextSteps: string[];
  personalizedAdvice: string;
}

// Lead Management Types
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  leadScore: number;
  status: 'pending' | 'contacted' | 'converted' | 'rejected';
  leadData: LeadData;
  brokerId?: string;
  brokerName?: string;
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
  notes: LeadNote[];
  documents: Document[];
}

export interface LeadData {
  income: number;
  debts: number;
  downPayment: number;
  propertyPrice: number;
  creditScore: number;
  employmentType: 'salaried' | 'self_employed' | 'contract' | 'retired';
  location: string;
  propertyType: 'single_family' | 'condo' | 'townhouse' | 'multi_family';
  loanPurpose: 'purchase' | 'refinance' | 'cash_out';
  timeline: 'immediate' | '1_3_months' | '3_6_months' | '6_12_months';
}

export interface LeadNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  isInternal: boolean;
}

// Document Management Types
export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  category: DocumentCategory;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  leadId?: string;
  isProcessed: boolean;
  extractedData?: any;
  tags: string[];
}

export type DocumentType = 
  | 'pdf' 
  | 'image' 
  | 'word' 
  | 'excel' 
  | 'text' 
  | 'other';

export type DocumentCategory = 
  | 'income_verification'
  | 'asset_verification'
  | 'employment_verification'
  | 'property_documents'
  | 'insurance'
  | 'legal'
  | 'other';

// Analytics Types
export interface AnalyticsData {
  userId: string;
  eventType: string;
  eventData: any;
  timestamp: string;
  sessionId: string;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  version: string;
  model: string;
  appVersion: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalCommission: number;
  avgResponseTime: number;
  activeLeads: number;
  monthlyTrends: MonthlyTrend[];
  leadSources: LeadSourceData[];
  performanceMetrics: PerformanceMetrics;
}

export interface MonthlyTrend {
  month: string;
  leads: number;
  converted: number;
  revenue: number;
}

export interface LeadSourceData {
  source: string;
  count: number;
  conversionRate: number;
  revenue: number;
}

export interface PerformanceMetrics {
  responseTime: number;
  followUpRate: number;
  clientSatisfaction: number;
  dealSize: number;
}

// Broker Portal Types
export interface Broker {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  licenseNumber: string;
  specialties: string[];
  regions: string[];
  rating: number;
  totalDeals: number;
  totalCommission: number;
  isActive: boolean;
  avatar?: string;
  bio?: string;
  languages: string[];
}

export interface CommissionReport {
  id: string;
  leadId: string;
  brokerId: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  notes?: string;
}

// Multi-language Support
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isRTL: boolean;
}

// Advanced Mortgage Products
export interface MortgageProduct {
  id: string;
  name: string;
  type: MortgageType;
  description: string;
  features: string[];
  requirements: string[];
  benefits: string[];
  risks: string[];
  eligibility: EligibilityCriteria;
  rates: ProductRate[];
  isActive: boolean;
  popularity: number;
}

export type MortgageType = 
  | 'conventional'
  | 'fha'
  | 'va'
  | 'usda'
  | 'jumbo'
  | 'arm'
  | 'interest_only'
  | 'reverse'
  | 'construction'
  | 'bridge';

export interface EligibilityCriteria {
  minCreditScore: number;
  maxLTV: number;
  maxDTI: number;
  minDownPayment: number;
  incomeRequirements: string[];
  propertyTypes: string[];
  occupancyTypes: string[];
}

export interface ProductRate {
  term: number;
  rate: number;
  apr: number;
  points: number;
  fees: number;
  isPromotional: boolean;
  validUntil?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email: string };
};

export type MainTabParamList = {
  Home: undefined;
  Calculator: undefined;
  Rates: undefined;
  Scenarios: undefined;
  Documents: undefined;
  Profile: undefined;
};

export type BrokerStackParamList = {
  Dashboard: undefined;
  Leads: undefined;
  Analytics: undefined;
  Commissions: undefined;
  Settings: undefined;
};

// Store Types
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  currency: 'CAD' | 'USD';
}

export interface MortgageState {
  affordabilityResults: AffordabilityResult[];
  currentAffordability: AffordabilityResult | null;
  rateResults: RateResult[];
  currentRates: RateResult[];
  scenarioComparisons: ScenarioComparison[];
  currentComparison: ScenarioComparison | null;
  leads: Lead[];
  currentLead: Lead | null;
  documents: Document[];
  loading: {
    affordability: boolean;
    rates: boolean;
    scenarios: boolean;
    leads: boolean;
    documents: boolean;
  };
  errors: {
    affordability: string | null;
    rates: string | null;
    scenarios: string | null;
    leads: string | null;
    documents: string | null;
  };
}