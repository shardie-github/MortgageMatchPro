import { NextApiRequest, NextApiResponse } from 'next'
import { OrganizationService } from '@/lib/tenancy/organization-service'
import { PermissionChecker } from '@/lib/tenancy/rbac'
import { TenantScoping } from '@/lib/tenancy/scoping'
import { UserRole } from '@/lib/types/tenancy'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { organizationId, userId, userRole } = req.query

    if (!organizationId || !userId || !userRole) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Check permissions
    if (!PermissionChecker.can(userRole as string, 'read', 'manage_users', organizationId as string)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'GET':
        // Get members
        const members = await OrganizationService.getMembers(
          organizationId as string,
          userId as string,
          userRole as string
        )
        return res.status(200).json({ members })

      case 'POST':
        // Invite user
        const { email, role } = req.body
        if (!email || !role) {
          return res.status(400).json({ error: 'Missing email or role' })
        }

        await OrganizationService.inviteUser(
          organizationId as string,
          email,
          role as UserRole,
          userId as string,
          userRole as string
        )
        return res.status(201).json({ success: true })

      case 'PUT':
        // Update user role
        const { targetUserId, newRole } = req.body
        if (!targetUserId || !newRole) {
          return res.status(400).json({ error: 'Missing targetUserId or newRole' })
        }

        await OrganizationService.updateUserRole(
          organizationId as string,
          targetUserId,
          newRole as UserRole,
          userId as string,
          userRole as string
        )
        return res.status(200).json({ success: true })

      case 'DELETE':
        // Remove user
        const { targetUserId: removeUserId } = req.body
        if (!removeUserId) {
          return res.status(400).json({ error: 'Missing targetUserId' })
        }

        await OrganizationService.removeUser(
          organizationId as string,
          removeUserId,
          userId as string,
          userRole as string
        )
        return res.status(200).json({ success: true })

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Admin members API error:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}