import { NextApiRequest, NextApiResponse } from 'next'
import { ApiKeyService } from '@/lib/tenancy/api-key-service'
import { PermissionChecker } from '@/lib/tenancy/rbac'

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
    if (!PermissionChecker.can(userRole as string, 'read', 'manage_api_keys', organizationId as string)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    switch (req.method) {
      case 'GET':
        // Get API keys
        const apiKeys = await ApiKeyService.getApiKeys(
          organizationId as string,
          userId as string,
          userRole as string
        )
        return res.status(200).json({ apiKeys })

      case 'POST':
        // Create API key
        const { name, scopes, expiresAt } = req.body
        if (!name || !scopes) {
          return res.status(400).json({ error: 'Missing name or scopes' })
        }

        const newApiKey = await ApiKeyService.createApiKey(
          organizationId as string,
          name,
          scopes,
          userId as string,
          userRole as string,
          expiresAt
        )
        return res.status(201).json({ apiKey: newApiKey })

      case 'PUT':
        // Update API key
        const { keyId, updates } = req.body
        if (!keyId || !updates) {
          return res.status(400).json({ error: 'Missing keyId or updates' })
        }

        const updatedApiKey = await ApiKeyService.updateApiKey(
          keyId,
          organizationId as string,
          updates,
          userId as string,
          userRole as string
        )
        return res.status(200).json({ apiKey: updatedApiKey })

      case 'DELETE':
        // Delete API key
        const { keyId: deleteKeyId } = req.body
        if (!deleteKeyId) {
          return res.status(400).json({ error: 'Missing keyId' })
        }

        await ApiKeyService.deleteApiKey(
          deleteKeyId,
          organizationId as string,
          userId as string,
          userRole as string
        )
        return res.status(200).json({ success: true })

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Admin API keys API error:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}