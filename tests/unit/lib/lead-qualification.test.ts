import { leadQualificationService, LEAD_SCORING_CRITERIA } from '@/lib/lead-qualification'

describe('Lead Qualification Service', () => {
  const mockLeadInput = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-123-4567',
    propertyValue: 500000,
    downPayment: 100000,
    income: 80000,
    employmentType: 'salaried' as const,
    creditScore: 750,
    preferredLender: 'Test Bank',
    additionalInfo: 'First time buyer',
    consentToShare: true,
    consentToContact: true,
  }

  describe('calculateLeadScore', () => {
    it('should calculate correct score for high-quality lead', () => {
      const score = leadQualificationService.calculateLeadScore(mockLeadInput)
      
      // Income > 75k: +20
      // Down payment >= 20%: +25
      // Credit >= 700: +30
      // TDS < 35%: +10 (estimated)
      // Salaried: +15
      // Expected: 20 + 25 + 30 + 10 + 15 = 100
      expect(score).toBe(100)
    })

    it('should calculate correct score for medium-quality lead', () => {
      const mediumLead = {
        ...mockLeadInput,
        income: 60000, // Below threshold
        downPayment: 50000, // 10% - below threshold
        creditScore: 650, // Below threshold
      }

      const score = leadQualificationService.calculateLeadScore(mediumLead)
      
      // Only TDS and salaried employment should score
      // Expected: 10 + 15 = 25
      expect(score).toBe(25)
    })

    it('should calculate correct score for low-quality lead', () => {
      const lowLead = {
        ...mockLeadInput,
        income: 40000,
        downPayment: 25000, // 5%
        creditScore: 580,
        employmentType: 'unemployed' as const,
      }

      const score = leadQualificationService.calculateLeadScore(lowLead)
      
      // Only TDS should score (if estimated TDS < 35%)
      // Expected: 10
      expect(score).toBe(10)
    })

    it('should handle edge cases correctly', () => {
      const edgeCaseLead = {
        ...mockLeadInput,
        income: 75000, // Exactly at threshold
        downPayment: 100000, // Exactly 20%
        creditScore: 700, // Exactly at threshold
      }

      const score = leadQualificationService.calculateLeadScore(edgeCaseLead)
      
      // All criteria should score
      expect(score).toBe(100)
    })
  })

  describe('getQualificationTier', () => {
    it('should return PREMIUM for high scores', () => {
      expect(leadQualificationService.getQualificationTier(85)).toBe('PREMIUM')
      expect(leadQualificationService.getQualificationTier(70)).toBe('PREMIUM')
    })

    it('should return STANDARD for medium scores', () => {
      expect(leadQualificationService.getQualificationTier(65)).toBe('STANDARD')
      expect(leadQualificationService.getQualificationTier(50)).toBe('STANDARD')
    })

    it('should return COACHING for low scores', () => {
      expect(leadQualificationService.getQualificationTier(45)).toBe('COACHING')
      expect(leadQualificationService.getQualificationTier(0)).toBe('COACHING')
    })
  })

  describe('generateRoutingDecision', () => {
    it('should generate appropriate routing for premium tier', () => {
      const result = leadQualificationService.generateRoutingDecision('PREMIUM', 85)
      
      expect(result.routingDecision).toContain('premium lender access')
      expect(result.nextSteps).toContain('Premium broker will contact you within 2 hours')
      expect(result.disclaimers).toContain('Sharing information with lenders does not guarantee mortgage approval')
    })

    it('should generate appropriate routing for standard tier', () => {
      const result = leadQualificationService.generateRoutingDecision('STANDARD', 60)
      
      expect(result.routingDecision).toContain('national broker network')
      expect(result.nextSteps).toContain('Broker will contact you within 4 hours')
    })

    it('should generate appropriate routing for coaching tier', () => {
      const result = leadQualificationService.generateRoutingDecision('COACHING', 30)
      
      expect(result.routingDecision).toContain('financial coaching')
      expect(result.nextSteps).toContain('Financial coach will contact you within 24 hours')
    })
  })

  describe('processLeadQualification', () => {
    it('should process complete lead qualification', async () => {
      // Mock the broker recommendations
      const mockBrokers = [
        {
          id: 'broker1',
          name: 'Test Broker',
          company: 'Test Company',
          phone: '555-000-0000',
          email: 'broker@test.com',
          commission_rate: 2.5,
          is_active: true,
        }
      ]

      // Mock Supabase response
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockBrokers,
                error: null
              })
            })
          })
        })
      }

      // Replace the supabaseAdmin import
      jest.doMock('@/lib/supabase', () => ({
        supabaseAdmin: mockSupabase
      }))

      const result = await leadQualificationService.processLeadQualification(mockLeadInput)

      expect(result.leadId).toBeDefined()
      expect(result.leadScore).toBe(100)
      expect(result.qualificationTier).toBe('PREMIUM')
      expect(result.brokerRecommendations).toBeDefined()
      expect(result.routingDecision).toBeDefined()
      expect(result.nextSteps).toBeDefined()
      expect(result.disclaimers).toBeDefined()
    })
  })
})