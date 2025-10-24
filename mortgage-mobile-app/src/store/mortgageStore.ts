import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface MortgageState {
  mortgageData: MortgageData;
  calculations: MortgageCalculation | null;
  scenarios: MortgageData[];
  setMortgageData: (data: Partial<MortgageData>) => void;
  calculateMortgage: () => void;
  addScenario: (scenario: MortgageData) => void;
  removeScenario: (index: number) => void;
  clearScenarios: () => void;
}

const defaultMortgageData: MortgageData = {
  propertyValue: 0,
  downPayment: 0,
  loanAmount: 0,
  interestRate: 0,
  loanTerm: 30,
  propertyType: 'primary',
  creditScore: 0,
  income: 0,
  monthlyDebt: 0,
  location: '',
};

export const useMortgageStore = create<MortgageState>()(
  persist(
    (set, get) => ({
      mortgageData: defaultMortgageData,
      calculations: null,
      scenarios: [],
      setMortgageData: (data: Partial<MortgageData>) => {
        const currentData = get().mortgageData;
        const newData = { ...currentData, ...data };
        set({ mortgageData: newData });
      },
      calculateMortgage: () => {
        const { mortgageData } = get();
        const { loanAmount, interestRate, loanTerm } = mortgageData;
        
        if (loanAmount <= 0 || interestRate <= 0 || loanTerm <= 0) {
          set({ calculations: null });
          return;
        }

        const monthlyRate = interestRate / 100 / 12;
        const numPayments = loanTerm * 12;
        const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
          (Math.pow(1 + monthlyRate, numPayments) - 1);
        
        const totalPayment = monthlyPayment * numPayments;
        const totalInterest = totalPayment - loanAmount;

        set({
          calculations: {
            monthlyPayment,
            totalInterest,
            totalPayment,
            principal: loanAmount,
            interest: totalInterest,
            remainingBalance: loanAmount,
          },
        });
      },
      addScenario: (scenario: MortgageData) => {
        const { scenarios } = get();
        set({ scenarios: [...scenarios, scenario] });
      },
      removeScenario: (index: number) => {
        const { scenarios } = get();
        const newScenarios = scenarios.filter((_, i) => i !== index);
        set({ scenarios: newScenarios });
      },
      clearScenarios: () => set({ scenarios: [] }),
    }),
    {
      name: 'mortgage-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);