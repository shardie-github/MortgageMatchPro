import { NextApiRequest, NextApiResponse } from 'next'
import { MeteringService } from '@/lib/billing/metering-service'
import { getBillingAdapter } from '@/lib/billing/billing-service'
import { PermissionChecker } from '@/lib/tenancy/rbac'
import { TenantScoping } from '@/lib/tenancy/scoping'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { organizationId, userId, userRole } = req.query

    if (!organizationId || !userId || !userRole) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Check permissions
    if (!PermissionChecker.can(userRole as string, 'read', 'view_billing', organizationId as string)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'GET':
        // Get billing information
        const { startDate, endDate } = req.query
        
        // Get organization limits
        const limits = await TenantScoping.getOrganizationLimits(organizationId as string)
        
        // Get usage for date range
        const usage = await MeteringService.getUsage(
          organizationId as string,
          startDate as string || new Date().toISOString().split('T')[0],
          endDate as string || new Date().toISOString().split('T')[0]
        )

        // Get billing customer
        const billingAdapter = getBillingAdapter()
        const customer = await billingAdapter.getCustomer(organizationId as string)

        return res.status(200).json({
          limits,
          usage,
          customer
        })

      case 'POST':
        // Create or update billing information
        const { action, data } = req.body

        switch (action) {
          case 'create_customer':
            const newCustomer = await billingAdapter.createCustomer({
              organizationId: organizationId as string,
              email: data.email,
              name: data.name
            })
            return res.status(201).json({ customer: newCustomer })

          case 'update_payment_method':
            const updatedCustomer = await billingAdapter.updateCustomer(
              organizationId as string,
              { paymentMethodId: data.paymentMethodId }
            )
            return res.status(200).json({ customer: updatedCustomer })

          case 'create_subscription':
            const subscription = await billingAdapter.createSubscription({
              customerId: organizationId as string,
              planId: data.planId,
              paymentMethodId: data.paymentMethodId
            })
            return res.status(201).json({ subscription })

          default:
            return res.status(400).json({ error: 'Invalid action' })
        }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Admin billing API error:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}