import { z } from 'zod'
import { supabaseAdmin } from '../supabase'

// Sustainable Product Schemas
export const GreenMortgagePackageSchema = z.object({
  packageId: z.string(),
  name: z.string(),
  description: z.string(),
  partnerBank: z.string(),
  partnerBankId: z.string(),
  baseRate: z.number(),
  greenDiscount: z.number(),
  finalRate: z.number(),
  requirements: z.array(z.object({
    category: z.enum(['energy_efficiency', 'renewable_energy', 'green_certification', 'sustainability_practices']),
    description: z.string(),
    required: z.boolean(),
    verificationMethod: z.string(),
  })),
  benefits: z.array(z.object({
    type: z.enum(['rate_discount', 'cashback', 'fee_waiver', 'insurance_discount', 'carbon_offset']),
    description: z.string(),
    value: z.number(),
    currency: z.string(),
  })),
  eligibility: z.object({
    minGreenScore: z.number(),
    maxLoanAmount: z.number(),
    minDownPayment: z.number(),
    propertyTypes: z.array(z.string()),
    regions: z.array(z.string()),
  }),
  terms: z.object({
    minTerm: z.number(),
    maxTerm: z.number(),
    prepaymentPenalty: z.boolean(),
    portability: z.boolean(),
    assumability: z.boolean(),
  }),
  sustainabilityMetrics: z.object({
    carbonReduction: z.number(), // kg CO2/year
    energySavings: z.number(), // kWh/year
    waterSavings: z.number(), // gallons/year
    greenCertificationPoints: z.number(),
  }),
  status: z.enum(['active', 'inactive', 'coming_soon', 'discontinued']),
  validFrom: z.string(),
  validUntil: z.string().optional(),
})

export const SustainabilityLinkedRateSchema = z.object({
  rateId: z.string(),
  packageId: z.string(),
  baseRate: z.number(),
  performanceTargets: z.array(z.object({
    metric: z.string(),
    target: z.number(),
    unit: z.string(),
    measurementPeriod: z.string(),
    adjustmentFactor: z.number(), // Rate adjustment per unit
  })),
  currentRate: z.number(),
  nextReviewDate: z.string(),
  performanceHistory: z.array(z.object({
    period: z.string(),
    metric: z.string(),
    actual: z.number(),
    target: z.number(),
    rateAdjustment: z.number(),
  })),
  incentives: z.array(z.object({
    type: z.enum(['rate_reduction', 'cashback', 'fee_waiver']),
    trigger: z.string(),
    value: z.number(),
    currency: z.string(),
  })),
})

export const CarbonOffsetRebateSchema = z.object({
  rebateId: z.string(),
  packageId: z.string(),
  offsetProvider: z.string(),
  offsetType: z.enum(['renewable_energy', 'forest_conservation', 'carbon_capture', 'energy_efficiency']),
  offsetAmount: z.number(), // kg CO2
  costPerTon: z.number(),
  totalCost: z.number(),
  rebateAmount: z.number(),
  currency: z.string(),
  status: z.enum(['pending', 'approved', 'completed', 'cancelled']),
  verification: z.object({
    provider: z.string(),
    certificateId: z.string(),
    verificationDate: z.string(),
    validityPeriod: z.string(),
  }),
  environmentalImpact: z.object({
    co2Reduced: z.number(),
    equivalentTrees: z.number(),
    equivalentCars: z.number(),
  }),
})

export const PartnerBankSchema = z.object({
  bankId: z.string(),
  name: z.string(),
  country: z.string(),
  regions: z.array(z.string()),
  sustainabilityCommitment: z.object({
    netZeroTarget: z.string(),
    esgRating: z.number().min(0).max(100),
    greenBondIssuance: z.number(),
    renewableEnergyInvestment: z.number(),
    carbonNeutralOperations: z.boolean(),
  }),
  productPortfolio: z.array(z.string()),
  partnershipTerms: z.object({
    revenueShare: z.number(),
    exclusivityPeriod: z.number(),
    marketingSupport: z.boolean(),
    coBranding: z.boolean(),
  }),
  contactInfo: z.object({
    email: z.string(),
    phone: z.string(),
    website: z.string(),
    sustainabilityOfficer: z.string(),
  }),
  status: z.enum(['active', 'inactive', 'pending_approval']),
})

export const GreenUpgradeIncentiveSchema = z.object({
  incentiveId: z.string(),
  upgradeType: z.enum(['solar_panels', 'insulation', 'hvac', 'windows', 'appliances', 'water_heater']),
  description: z.string(),
  maxIncentive: z.number(),
  incentiveRate: z.number(), // Percentage of cost
  requirements: z.array(z.string()),
  verificationProcess: z.string(),
  validUntil: z.string(),
  environmentalImpact: z.object({
    energySavings: z.number(),
    carbonReduction: z.number(),
    paybackPeriod: z.number(),
  }),
  financingOptions: z.array(z.object({
    type: z.enum(['loan', 'lease', 'ppa', 'rebate']),
    provider: z.string(),
    terms: z.string(),
    rate: z.number().optional(),
  })),
})

export type GreenMortgagePackage = z.infer<typeof GreenMortgagePackageSchema>
export type SustainabilityLinkedRate = z.infer<typeof SustainabilityLinkedRateSchema>
export type CarbonOffsetRebate = z.infer<typeof CarbonOffsetRebateSchema>
export type PartnerBank = z.infer<typeof PartnerBankSchema>
export type GreenUpgradeIncentive = z.infer<typeof GreenUpgradeIncentiveSchema>

// Sustainable Products Agent
export class SustainableProductsAgent {
  private partnerBanks: Map<string, PartnerBank>
  private greenPackages: Map<string, GreenMortgagePackage>
  private upgradeIncentives: Map<string, GreenUpgradeIncentive>

  constructor() {
    this.partnerBanks = new Map()
    this.greenPackages = new Map()
    this.upgradeIncentives = new Map()
    
    this.initializePartnerBanks()
    this.initializeGreenPackages()
    this.initializeUpgradeIncentives()
  }

  private initializePartnerBanks(): void {
    const banks: PartnerBank[] = [
      {
        bankId: 'RBC-GREEN',
        name: 'Royal Bank of Canada - Green Division',
        country: 'CA',
        regions: ['CA'],
        sustainabilityCommitment: {
          netZeroTarget: '2050',
          esgRating: 85,
          greenBondIssuance: 5000000000, // $5B
          renewableEnergyInvestment: 2000000000, // $2B
          carbonNeutralOperations: true,
        },
        productPortfolio: ['green_mortgages', 'sustainability_linked_loans', 'carbon_offset_products'],
        partnershipTerms: {
          revenueShare: 0.15,
          exclusivityPeriod: 24,
          marketingSupport: true,
          coBranding: true,
        },
        contactInfo: {
          email: 'green@rbc.com',
          phone: '1-800-RBC-GREEN',
          website: 'https://rbc.com/green',
          sustainabilityOfficer: 'Sarah Johnson',
        },
        status: 'active',
      },
      {
        bankId: 'TD-GREEN',
        name: 'TD Bank - Sustainable Finance',
        country: 'CA',
        regions: ['CA', 'US'],
        sustainabilityCommitment: {
          netZeroTarget: '2050',
          esgRating: 82,
          greenBondIssuance: 3000000000, // $3B
          renewableEnergyInvestment: 1500000000, // $1.5B
          carbonNeutralOperations: true,
        },
        productPortfolio: ['green_mortgages', 'esg_investing', 'sustainability_advisory'],
        partnershipTerms: {
          revenueShare: 0.12,
          exclusivityPeriod: 18,
          marketingSupport: true,
          coBranding: true,
        },
        contactInfo: {
          email: 'sustainable@td.com',
          phone: '1-800-TD-GREEN',
          website: 'https://td.com/sustainable',
          sustainabilityOfficer: 'Michael Chen',
        },
        status: 'active',
      },
      {
        bankId: 'BMO-GREEN',
        name: 'BMO - Climate Action',
        country: 'CA',
        regions: ['CA'],
        sustainabilityCommitment: {
          netZeroTarget: '2050',
          esgRating: 80,
          greenBondIssuance: 2000000000, // $2B
          renewableEnergyInvestment: 1000000000, // $1B
          carbonNeutralOperations: false,
        },
        productPortfolio: ['green_mortgages', 'climate_finance', 'carbon_credits'],
        partnershipTerms: {
          revenueShare: 0.10,
          exclusivityPeriod: 12,
          marketingSupport: false,
          coBranding: true,
        },
        contactInfo: {
          email: 'climate@bmo.com',
          phone: '1-800-BMO-CLIMATE',
          website: 'https://bmo.com/climate',
          sustainabilityOfficer: 'Emily Rodriguez',
        },
        status: 'active',
      },
      {
        bankId: 'WELLS-GREEN',
        name: 'Wells Fargo - Sustainable Finance',
        country: 'US',
        regions: ['US'],
        sustainabilityCommitment: {
          netZeroTarget: '2050',
          esgRating: 75,
          greenBondIssuance: 10000000000, // $10B
          renewableEnergyInvestment: 5000000000, // $5B
          carbonNeutralOperations: true,
        },
        productPortfolio: ['green_mortgages', 'sustainability_linked_loans', 'green_bonds'],
        partnershipTerms: {
          revenueShare: 0.18,
          exclusivityPeriod: 36,
          marketingSupport: true,
          coBranding: true,
        },
        contactInfo: {
          email: 'sustainable@wellsfargo.com',
          phone: '1-800-WELLS-GREEN',
          website: 'https://wellsfargo.com/sustainable',
          sustainabilityOfficer: 'David Thompson',
        },
        status: 'active',
      },
    ]

    banks.forEach(bank => {
      this.partnerBanks.set(bank.bankId, bank)
    })
  }

  private initializeGreenPackages(): void {
    const packages: GreenMortgagePackage[] = [
      {
        packageId: 'RBC-GREEN-PREMIUM',
        name: 'RBC Green Mortgage Premium',
        description: 'Premium green mortgage with maximum sustainability benefits and rate discounts',
        partnerBank: 'Royal Bank of Canada - Green Division',
        partnerBankId: 'RBC-GREEN',
        baseRate: 5.45,
        greenDiscount: 0.50,
        finalRate: 4.95,
        requirements: [
          {
            category: 'energy_efficiency',
            description: 'Property must have ENERGY STAR rating of 75 or higher',
            required: true,
            verificationMethod: 'ENERGY STAR certification',
          },
          {
            category: 'renewable_energy',
            description: 'At least 25% of energy from renewable sources',
            required: true,
            verificationMethod: 'Utility bills and renewable energy certificates',
          },
          {
            category: 'green_certification',
            description: 'LEED Gold or equivalent green building certification',
            required: true,
            verificationMethod: 'LEED certification document',
          },
        ],
        benefits: [
          {
            type: 'rate_discount',
            description: '0.50% rate discount for green features',
            value: 0.50,
            currency: 'CAD',
          },
          {
            type: 'cashback',
            description: '$2,000 cashback for green upgrades',
            value: 2000,
            currency: 'CAD',
          },
          {
            type: 'fee_waiver',
            description: 'Waived application and appraisal fees',
            value: 500,
            currency: 'CAD',
          },
        ],
        eligibility: {
          minGreenScore: 80,
          maxLoanAmount: 2000000,
          minDownPayment: 5,
          propertyTypes: ['single_family', 'condo', 'townhouse'],
          regions: ['CA'],
        },
        terms: {
          minTerm: 1,
          maxTerm: 30,
          prepaymentPenalty: false,
          portability: true,
          assumability: true,
        },
        sustainabilityMetrics: {
          carbonReduction: 5000,
          energySavings: 8000,
          waterSavings: 20000,
          greenCertificationPoints: 100,
        },
        status: 'active',
        validFrom: '2024-01-01',
      },
      {
        packageId: 'TD-GREEN-STANDARD',
        name: 'TD Green Mortgage Standard',
        description: 'Standard green mortgage with moderate sustainability requirements',
        partnerBank: 'TD Bank - Sustainable Finance',
        partnerBankId: 'TD-GREEN',
        baseRate: 5.52,
        greenDiscount: 0.25,
        finalRate: 5.27,
        requirements: [
          {
            category: 'energy_efficiency',
            description: 'Property must have ENERGY STAR rating of 60 or higher',
            required: true,
            verificationMethod: 'ENERGY STAR certification',
          },
          {
            category: 'sustainability_practices',
            description: 'Borrower must demonstrate sustainable living practices',
            required: true,
            verificationMethod: 'Sustainability questionnaire and documentation',
          },
        ],
        benefits: [
          {
            type: 'rate_discount',
            description: '0.25% rate discount for green features',
            value: 0.25,
            currency: 'CAD',
          },
          {
            type: 'cashback',
            description: '$1,000 cashback for green upgrades',
            value: 1000,
            currency: 'CAD',
          },
        ],
        eligibility: {
          minGreenScore: 60,
          maxLoanAmount: 1500000,
          minDownPayment: 10,
          propertyTypes: ['single_family', 'condo', 'townhouse', 'multi_family'],
          regions: ['CA', 'US'],
        },
        terms: {
          minTerm: 1,
          maxTerm: 30,
          prepaymentPenalty: false,
          portability: true,
          assumability: false,
        },
        sustainabilityMetrics: {
          carbonReduction: 2500,
          energySavings: 4000,
          waterSavings: 10000,
          greenCertificationPoints: 60,
        },
        status: 'active',
        validFrom: '2024-01-01',
      },
      {
        packageId: 'WELLS-GREEN-ADVANTAGE',
        name: 'Wells Fargo Green Advantage',
        description: 'Comprehensive green mortgage with renewable energy focus',
        partnerBank: 'Wells Fargo - Sustainable Finance',
        partnerBankId: 'WELLS-GREEN',
        baseRate: 6.25,
        greenDiscount: 0.75,
        finalRate: 5.50,
        requirements: [
          {
            category: 'renewable_energy',
            description: 'Property must have solar panels or other renewable energy system',
            required: true,
            verificationMethod: 'Installation certificate and utility interconnection agreement',
          },
          {
            category: 'energy_efficiency',
            description: 'Property must meet ENERGY STAR requirements',
            required: true,
            verificationMethod: 'ENERGY STAR certification',
          },
        ],
        benefits: [
          {
            type: 'rate_discount',
            description: '0.75% rate discount for renewable energy',
            value: 0.75,
            currency: 'USD',
          },
          {
            type: 'cashback',
            description: '$3,000 cashback for additional green upgrades',
            value: 3000,
            currency: 'USD',
          },
          {
            type: 'carbon_offset',
            description: 'Annual carbon offset credits worth $500',
            value: 500,
            currency: 'USD',
          },
        ],
        eligibility: {
          minGreenScore: 70,
          maxLoanAmount: 3000000,
          minDownPayment: 5,
          propertyTypes: ['single_family', 'condo', 'townhouse'],
          regions: ['US'],
        },
        terms: {
          minTerm: 1,
          maxTerm: 30,
          prepaymentPenalty: false,
          portability: true,
          assumability: true,
        },
        sustainabilityMetrics: {
          carbonReduction: 8000,
          energySavings: 12000,
          waterSavings: 15000,
          greenCertificationPoints: 85,
        },
        status: 'active',
        validFrom: '2024-01-01',
      },
    ]

    packages.forEach(pkg => {
      this.greenPackages.set(pkg.packageId, pkg)
    })
  }

  private initializeUpgradeIncentives(): void {
    const incentives: GreenUpgradeIncentive[] = [
      {
        incentiveId: 'SOLAR-REBATE-2024',
        upgradeType: 'solar_panels',
        description: 'Solar panel installation rebate program',
        maxIncentive: 10000,
        incentiveRate: 0.30,
        requirements: [
          'Property must be primary residence',
          'Solar system must be grid-tied',
          'Minimum 3kW system size',
          'Installation by certified contractor',
        ],
        verificationProcess: 'Submit installation certificate and utility interconnection agreement',
        validUntil: '2024-12-31',
        environmentalImpact: {
          energySavings: 5000,
          carbonReduction: 3000,
          paybackPeriod: 7,
        },
        financingOptions: [
          {
            type: 'loan',
            provider: 'Green Energy Finance Co.',
            terms: '0% APR for 5 years',
            rate: 0,
          },
          {
            type: 'lease',
            provider: 'Solar Lease Partners',
            terms: 'No upfront cost, monthly payments',
          },
        ],
      },
      {
        incentiveId: 'INSULATION-REBATE-2024',
        upgradeType: 'insulation',
        description: 'Home insulation improvement rebate',
        maxIncentive: 2000,
        incentiveRate: 0.50,
        requirements: [
          'Property must be at least 10 years old',
          'Insulation must meet R-value requirements',
          'Installation by certified contractor',
        ],
        verificationProcess: 'Submit before/after energy audit and installation receipt',
        validUntil: '2024-12-31',
        environmentalImpact: {
          energySavings: 2000,
          carbonReduction: 1200,
          paybackPeriod: 3,
        },
        financingOptions: [
          {
            type: 'loan',
            provider: 'Home Improvement Finance',
            terms: '2.99% APR for 3 years',
            rate: 2.99,
          },
        ],
      },
      {
        incentiveId: 'HVAC-REBATE-2024',
        upgradeType: 'hvac',
        description: 'High-efficiency HVAC system rebate',
        maxIncentive: 3000,
        incentiveRate: 0.25,
        requirements: [
          'System must be ENERGY STAR certified',
          'Minimum SEER rating of 16',
          'Installation by licensed contractor',
        ],
        verificationProcess: 'Submit ENERGY STAR certificate and installation receipt',
        validUntil: '2024-12-31',
        environmentalImpact: {
          energySavings: 3000,
          carbonReduction: 1800,
          paybackPeriod: 5,
        },
        financingOptions: [
          {
            type: 'loan',
            provider: 'HVAC Finance Solutions',
            terms: '1.99% APR for 4 years',
            rate: 1.99,
          },
        ],
      },
    ]

    incentives.forEach(incentive => {
      this.upgradeIncentives.set(incentive.incentiveId, incentive)
    })
  }

  // Find suitable green mortgage packages
  async findSuitableGreenPackages(criteria: {
    propertyValue: number
    downPayment: number
    greenScore: number
    propertyType: string
    region: string
    preferredFeatures?: string[]
  }): Promise<{
    packages: GreenMortgagePackage[]
    recommendations: Array<{
      packageId: string
      matchScore: number
      reasoning: string
      estimatedSavings: number
    }>
  }> {
    const suitablePackages: GreenMortgagePackage[] = []
    const recommendations: Array<{
      packageId: string
      matchScore: number
      reasoning: string
      estimatedSavings: number
    }> = []

    for (const [packageId, pkg] of this.greenPackages) {
      if (pkg.status !== 'active') continue

      // Check eligibility
      if (criteria.greenScore < pkg.eligibility.minGreenScore) continue
      if (criteria.propertyValue > pkg.eligibility.maxLoanAmount) continue
      if (criteria.downPayment < pkg.eligibility.minDownPayment) continue
      if (!pkg.eligibility.propertyTypes.includes(criteria.propertyType)) continue
      if (!pkg.eligibility.regions.includes(criteria.region)) continue

      suitablePackages.push(pkg)

      // Calculate match score
      let matchScore = 0
      let reasoning = ''

      // Green score match
      const greenScoreMatch = Math.min(criteria.greenScore / pkg.eligibility.minGreenScore, 1)
      matchScore += greenScoreMatch * 0.3

      // Rate discount value
      const rateDiscountValue = pkg.greenDiscount / criteria.propertyValue * 1000000 // Per $1M
      matchScore += Math.min(rateDiscountValue / 0.5, 1) * 0.25

      // Benefits value
      const totalBenefits = pkg.benefits.reduce((sum, benefit) => sum + benefit.value, 0)
      const benefitsValue = totalBenefits / criteria.propertyValue * 1000000 // Per $1M
      matchScore += Math.min(benefitsValue / 5000, 1) * 0.2

      // Requirements complexity (simpler is better)
      const requirementsComplexity = 1 - (pkg.requirements.length / 10)
      matchScore += requirementsComplexity * 0.15

      // Sustainability impact
      const sustainabilityImpact = Math.min(pkg.sustainabilityMetrics.carbonReduction / 5000, 1)
      matchScore += sustainabilityImpact * 0.1

      matchScore = Math.round(matchScore * 100) / 100

      // Generate reasoning
      if (greenScoreMatch > 0.9) {
        reasoning += 'Excellent green score match. '
      } else if (greenScoreMatch > 0.7) {
        reasoning += 'Good green score match. '
      }

      if (pkg.greenDiscount > 0.5) {
        reasoning += 'High rate discount available. '
      } else if (pkg.greenDiscount > 0.25) {
        reasoning += 'Moderate rate discount available. '
      }

      if (totalBenefits > 2000) {
        reasoning += 'Significant additional benefits. '
      }

      // Calculate estimated savings
      const annualSavings = (criteria.propertyValue - criteria.downPayment) * pkg.greenDiscount / 100
      const totalSavings = annualSavings * 25 // 25-year term
      const additionalBenefits = totalBenefits
      const estimatedSavings = totalSavings + additionalBenefits

      recommendations.push({
        packageId,
        matchScore,
        reasoning: reasoning.trim(),
        estimatedSavings: Math.round(estimatedSavings),
      })
    }

    // Sort by match score
    recommendations.sort((a, b) => b.matchScore - a.matchScore)

    return {
      packages: suitablePackages,
      recommendations,
    }
  }

  // Calculate sustainability-linked rate adjustments
  async calculateSustainabilityLinkedRate(packageId: string, performanceData: {
    energyConsumption: number
    renewableEnergyPercentage: number
    carbonFootprint: number
    greenCertifications: string[]
  }): Promise<SustainabilityLinkedRate> {
    const pkg = this.greenPackages.get(packageId)
    if (!pkg) {
      throw new Error(`Package not found: ${packageId}`)
    }

    const rateId = `SLR-${Date.now()}`
    const baseRate = pkg.baseRate
    let currentRate = baseRate
    let totalAdjustment = 0

    const performanceTargets = [
      {
        metric: 'energy_efficiency',
        target: 80, // ENERGY STAR score
        unit: 'score',
        measurementPeriod: 'annual',
        adjustmentFactor: -0.01, // -0.01% per point above target
      },
      {
        metric: 'renewable_energy',
        target: 50, // 50% renewable
        unit: 'percentage',
        measurementPeriod: 'annual',
        adjustmentFactor: -0.02, // -0.02% per percentage point above target
      },
      {
        metric: 'carbon_footprint',
        target: 2000, // kg CO2/year
        unit: 'kg',
        measurementPeriod: 'annual',
        adjustmentFactor: 0.001, // +0.001% per kg above target
      },
    ]

    const performanceHistory = []
    const incentives = []

    // Calculate rate adjustments based on performance
    for (const target of performanceTargets) {
      let actual = 0
      let rateAdjustment = 0

      switch (target.metric) {
        case 'energy_efficiency':
          actual = 75 // Mock energy efficiency score
          rateAdjustment = (actual - target.target) * target.adjustmentFactor
          break
        case 'renewable_energy':
          actual = performanceData.renewableEnergyPercentage
          rateAdjustment = (actual - target.target) * target.adjustmentFactor
          break
        case 'carbon_footprint':
          actual = performanceData.carbonFootprint
          rateAdjustment = (actual - target.target) * target.adjustmentFactor
          break
      }

      currentRate += rateAdjustment
      totalAdjustment += rateAdjustment

      performanceHistory.push({
        period: '2024-Q1',
        metric: target.metric,
        actual,
        target: target.target,
        rateAdjustment,
      })

      // Generate incentives for good performance
      if (actual > target.target) {
        incentives.push({
          type: 'rate_reduction',
          trigger: `${target.metric} exceeded target by ${actual - target.target} ${target.unit}`,
          value: Math.abs(rateAdjustment),
          currency: 'CAD',
        })
      }
    }

    // Apply maximum rate adjustment limits
    const maxAdjustment = 0.5 // 0.5% maximum adjustment
    if (totalAdjustment < -maxAdjustment) {
      currentRate = baseRate - maxAdjustment
    } else if (totalAdjustment > maxAdjustment) {
      currentRate = baseRate + maxAdjustment
    }

    const sustainabilityLinkedRate: SustainabilityLinkedRate = {
      rateId,
      packageId,
      baseRate,
      performanceTargets,
      currentRate: Math.round(currentRate * 100) / 100,
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      performanceHistory,
      incentives,
    }

    return sustainabilityLinkedRate
  }

  // Process carbon offset rebate
  async processCarbonOffsetRebate(packageId: string, offsetAmount: number): Promise<CarbonOffsetRebate> {
    const pkg = this.greenPackages.get(packageId)
    if (!pkg) {
      throw new Error(`Package not found: ${packageId}`)
    }

    const rebateId = `COR-${Date.now()}`
    const costPerTon = 50 // $50 per ton CO2
    const totalCost = (offsetAmount / 1000) * costPerTon
    const rebateAmount = totalCost * 0.5 // 50% rebate

    const carbonOffsetRebate: CarbonOffsetRebate = {
      rebateId,
      packageId,
      offsetProvider: 'Carbon Trust International',
      offsetType: 'renewable_energy',
      offsetAmount,
      costPerTon,
      totalCost: Math.round(totalCost),
      rebateAmount: Math.round(rebateAmount),
      currency: 'CAD',
      status: 'pending',
      verification: {
        provider: 'Verra',
        certificateId: `VER-${Date.now()}`,
        verificationDate: new Date().toISOString(),
        validityPeriod: '2024-12-31',
      },
      environmentalImpact: {
        co2Reduced: offsetAmount,
        equivalentTrees: Math.round(offsetAmount / 22), // 22 kg CO2 per tree per year
        equivalentCars: Math.round(offsetAmount / 4600), // 4600 kg CO2 per car per year
      },
    }

    // Store in database
    await supabaseAdmin
      .from('carbon_offset_rebates')
      .insert([carbonOffsetRebate])

    return carbonOffsetRebate
  }

  // Get available green upgrade incentives
  async getGreenUpgradeIncentives(propertyType: string, region: string): Promise<{
    incentives: GreenUpgradeIncentive[]
    totalPotentialSavings: number
    recommendations: Array<{
      incentiveId: string
      priority: 'high' | 'medium' | 'low'
      reasoning: string
      estimatedSavings: number
    }>
  }> {
    const availableIncentives: GreenUpgradeIncentive[] = []
    const recommendations: Array<{
      incentiveId: string
      priority: 'high' | 'medium' | 'low'
      reasoning: string
      estimatedSavings: number
    }> = []

    let totalPotentialSavings = 0

    for (const [incentiveId, incentive] of this.upgradeIncentives) {
      if (new Date(incentive.validUntil) < new Date()) continue

      availableIncentives.push(incentive)
      totalPotentialSavings += incentive.maxIncentive

      // Determine priority based on impact and cost
      let priority: 'high' | 'medium' | 'low' = 'low'
      let reasoning = ''
      let estimatedSavings = incentive.maxIncentive

      if (incentive.environmentalImpact.paybackPeriod <= 3) {
        priority = 'high'
        reasoning = 'Quick payback period and high environmental impact'
      } else if (incentive.environmentalImpact.paybackPeriod <= 5) {
        priority = 'medium'
        reasoning = 'Moderate payback period with good environmental impact'
      } else {
        priority = 'low'
        reasoning = 'Longer payback period but still beneficial'
      }

      if (incentive.incentiveRate >= 0.5) {
        reasoning += '. High rebate rate available.'
        if (priority === 'low') priority = 'medium'
      }

      recommendations.push({
        incentiveId,
        priority,
        reasoning,
        estimatedSavings,
      })
    }

    // Sort by priority and estimated savings
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return b.estimatedSavings - a.estimatedSavings
    })

    return {
      incentives: availableIncentives,
      totalPotentialSavings,
      recommendations,
    }
  }

  // Generate ESG-Secure Mortgage Index
  async generateESGSecureMortgageIndex(): Promise<{
    indexId: string
    timestamp: string
    overallIndex: number
    regionalIndices: Record<string, number>
    sectorIndices: Record<string, number>
    riskFactors: string[]
    marketOutlook: string
    topPerformingPackages: Array<{
      packageId: string
      name: string
      performanceScore: number
      sustainabilityImpact: number
    }>
  }> {
    const indexId = `ESG-INDEX-${Date.now()}`
    
    // Calculate overall index based on package performance
    const packageScores = Array.from(this.greenPackages.values()).map(pkg => {
      const sustainabilityScore = pkg.sustainabilityMetrics.carbonReduction / 1000 // Normalize
      const adoptionScore = pkg.status === 'active' ? 1 : 0
      const benefitScore = pkg.benefits.reduce((sum, benefit) => sum + benefit.value, 0) / 1000
      return (sustainabilityScore + adoptionScore + benefitScore) / 3
    })

    const overallIndex = packageScores.length > 0 
      ? Math.round(packageScores.reduce((sum, score) => sum + score, 0) / packageScores.length * 100)
      : 0

    // Calculate regional indices
    const regionalIndices: Record<string, number> = {}
    const regionPackages: Record<string, GreenMortgagePackage[]> = {}

    for (const pkg of this.greenPackages.values()) {
      for (const region of pkg.eligibility.regions) {
        if (!regionPackages[region]) regionPackages[region] = []
        regionPackages[region].push(pkg)
      }
    }

    for (const [region, packages] of Object.entries(regionPackages)) {
      const regionScores = packages.map(pkg => {
        const sustainabilityScore = pkg.sustainabilityMetrics.carbonReduction / 1000
        const benefitScore = pkg.benefits.reduce((sum, benefit) => sum + benefit.value, 0) / 1000
        return (sustainabilityScore + benefitScore) / 2
      })
      regionalIndices[region] = Math.round(
        regionScores.reduce((sum, score) => sum + score, 0) / regionScores.length * 100
      )
    }

    // Calculate sector indices
    const sectorIndices: Record<string, number> = {
      'residential': 75,
      'commercial': 68,
      'industrial': 62,
    }

    // Identify risk factors
    const riskFactors = [
      'Regulatory changes affecting green mortgage incentives',
      'Economic downturn reducing demand for premium green products',
      'Technology disruption in renewable energy sector',
      'Climate change physical risks affecting property values',
    ]

    // Generate market outlook
    const marketOutlook = overallIndex > 70 
      ? 'Strong growth in ESG mortgage adoption with increasing regulatory support'
      : overallIndex > 50
      ? 'Moderate growth with some market challenges'
      : 'Challenging market conditions requiring strategic adjustments'

    // Get top performing packages
    const topPerformingPackages = Array.from(this.greenPackages.values())
      .map(pkg => ({
        packageId: pkg.packageId,
        name: pkg.name,
        performanceScore: Math.round(
          (pkg.sustainabilityMetrics.carbonReduction / 1000 + 
           pkg.benefits.reduce((sum, benefit) => sum + benefit.value, 0) / 1000) * 50
        ),
        sustainabilityImpact: pkg.sustainabilityMetrics.carbonReduction,
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 5)

    return {
      indexId,
      timestamp: new Date().toISOString(),
      overallIndex,
      regionalIndices,
      sectorIndices,
      riskFactors,
      marketOutlook,
      topPerformingPackages,
    }
  }
}