import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/leads'
import { leadQualificationService } from '@/lib/lead-qualification'
import { brokerNotificationService } from '@/lib/broker-notifications'

// Mock dependencies
jest.mock('@/lib/lead-qualification')
jest.mock('@/lib/broker-notifications')
jest.mock('@/lib/supabase')
jest.mock('@/lib/security')
jest.mock('@/lib/monitoring')

const mockLeadQualificationService = leadQualificationService as jest.Mocked<typeof leadQualificationService>
const mockBrokerNotificationService = brokerNotificationService as jest.Mocked<typeof brokerNotificationService>

describe('/api/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const validLeadData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-123-4567',
    propertyValue: 500000,
    downPayment: 100000,
    income: 80000,
    employmentType: 'salaried',
    creditScore: 750,
    preferredLender: 'Test Bank',
    additionalInfo: 'First time buyer',
    consentToShare: true,
    consentToContact: true,
  }

  it('should process valid lead submission successfully', async () => {
    const mockQualificationResult = {
      leadId: 'lead_123',
      leadScore: 85,
      qualificationTier: 'PREMIUM',
      brokerRecommendations: [
        {
          brokerId: 'broker_1',
          name: 'Test Broker',
          company: 'Test Company',
          phone: '555-000-0000',
          email: 'broker@test.com',
          commissionRate: 2.5,
          matchReason: 'High-quality lead',
          tier: 'premium' as const
        }
      ],
      routingDecision: 'Premium routing',
      nextSteps: ['Contact within 2 hours'],
      disclaimers: ['No guarantee of approval']
    }

    mockLeadQualificationService.processLeadQualification.mockResolvedValue(mockQualificationResult)
    mockLeadQualificationService.saveLead.mockResolvedValue('lead_123')
    mockBrokerNotificationService.sendNotifications.mockResolvedValue({
      smsSuccess: true,
      emailSuccess: true
    })

    const { req, res } = createMocks({
      method: 'POST',
      body: validLeadData,
      headers: {
        authorization: 'Bearer valid-token'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData.success).toBe(true)
    expect(responseData.leadId).toBe('lead_123')
    expect(responseData.leadScore).toBe(85)
    expect(responseData.qualificationTier).toBe('PREMIUM')
  })

  it('should reject lead without consent', async () => {
    const invalidLeadData = {
      ...validLeadData,
      consentToShare: false,
      consentToContact: false
    }

    const { req, res } = createMocks({
      method: 'POST',
      body: invalidLeadData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const responseData = JSON.parse(res._getData())
    expect(responseData.error).toBe('Consent required')
  })

  it('should handle qualification service errors', async () => {
    mockLeadQualificationService.processLeadQualification.mockRejectedValue(
      new Error('Qualification failed')
    )

    const { req, res } = createMocks({
      method: 'POST',
      body: validLeadData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
  })

  it('should handle notification failures gracefully', async () => {
    const mockQualificationResult = {
      leadId: 'lead_123',
      leadScore: 85,
      qualificationTier: 'PREMIUM',
      brokerRecommendations: [
        {
          brokerId: 'broker_1',
          name: 'Test Broker',
          company: 'Test Company',
          phone: '555-000-0000',
          email: 'broker@test.com',
          commissionRate: 2.5,
          matchReason: 'High-quality lead',
          tier: 'premium' as const
        }
      ],
      routingDecision: 'Premium routing',
      nextSteps: ['Contact within 2 hours'],
      disclaimers: ['No guarantee of approval']
    }

    mockLeadQualificationService.processLeadQualification.mockResolvedValue(mockQualificationResult)
    mockLeadQualificationService.saveLead.mockResolvedValue('lead_123')
    mockBrokerNotificationService.sendNotifications.mockRejectedValue(
      new Error('Notification failed')
    )

    const { req, res } = createMocks({
      method: 'POST',
      body: validLeadData
    })

    await handler(req, res)

    // Should still succeed even if notifications fail
    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData.success).toBe(true)
  })

  it('should validate required fields', async () => {
    const incompleteLeadData = {
      name: 'John Doe',
      email: 'invalid-email', // Invalid email
      // Missing required fields
    }

    const { req, res } = createMocks({
      method: 'POST',
      body: incompleteLeadData
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
  })
})