export interface MortgageData {
  propertyValue: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  propertyType: 'primary' | 'secondary' | 'investment';
  creditScore: number;
  income: number;
  monthlyDebt: number;
  location: string;
}

export interface MortgageCalculation {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface Lender {
  id: string;
  name: string;
  logo: string;
  interestRate: number;
  apr: number;
  monthlyPayment: number;
  totalCost: number;
  rating: number;
  reviews: number;
  features: string[];
  contactInfo: {
    phone: string;
    email: string;
    website: string;
  };
}

export interface Application {
  id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
  updatedAt: string;
  mortgageData: MortgageData;
  documents: Document[];
  notes: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface MarketInsight {
  location: string;
  averagePrice: number;
  priceChange: number;
  inventory: number;
  daysOnMarket: number;
  interestRateTrend: number;
  forecast: {
    price: number;
    confidence: number;
  };
}