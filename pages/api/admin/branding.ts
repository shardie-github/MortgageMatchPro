import { NextApiRequest, NextApiResponse } from 'next'
import { OrganizationService } from '@/lib/tenancy/organization-service'
import { PermissionChecker } from '@/lib/tenancy/rbac'
import { OrganizationBranding } from '@/lib/types/tenancy'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { organizationId, userId, userRole } = req.query

    if (!organizationId || !userId || !userRole) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Check permissions
    if (!PermissionChecker.can(userRole as string, 'read', 'manage_branding', organizationId as string)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'GET':
        // Get organization branding
        const organization = await OrganizationService.getOrganization(
          organizationId as string,
          userId as string,
          userRole as string
        )
        return res.status(200).json({ branding: organization.branding })

      case 'PUT':
        // Update branding
        const branding: OrganizationBranding = req.body
        if (!branding) {
          return res.status(400).json({ error: 'Missing branding data' })
        }

        await OrganizationService.updateBranding(
          organizationId as string,
          branding,
          userId as string,
          userRole as string
        )
        return res.status(200).json({ success: true })

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Admin branding API error:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}