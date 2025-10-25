import React, { useState, useEffect } from 'react'
import { useTenantContext } from '@/lib/tenancy/context'
import { OrganizationService } from '@/lib/tenancy/organization-service'
import { PermissionChecker } from '@/lib/tenancy/rbac'
import { UserRole, Membership } from '@/lib/types/tenancy'
import { 
  Plus, 
  Mail, 
  UserPlus, 
  MoreVertical, 
  Trash2, 
  Edit,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react'

const MembersManagement: React.FC = () => {
  const { organization, user, role } = useTenantContext()
  const [members, setMembers] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('VIEWER')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMembers()
  }, [organization?.id])

  const loadMembers = async () => {
    if (!organization?.id || !user?.id) return

    try {
      setLoading(true)
      const membersList = await OrganizationService.getMembers(organization.id, user.id, role)
      setMembers(membersList)
    } catch (err) {
      console.error('Failed to load members:', err)
      setError('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization?.id || !user?.id || !inviteEmail) return

    try {
      setInviteLoading(true)
      setError(null)

      await OrganizationService.inviteUser(
        organization.id,
        inviteEmail,
        inviteRole,
        user.id,
        role
      )

      setInviteEmail('')
      setInviteRole('VIEWER')
      setShowInviteModal(false)
      await loadMembers()
    } catch (err) {
      console.error('Failed to invite user:', err)
      setError(err instanceof Error ? err.message : 'Failed to invite user')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!organization?.id || !user?.id) return

    try {
      await OrganizationService.removeUser(organization.id, userId, user.id, role)
      await loadMembers()
    } catch (err) {
      console.error('Failed to remove user:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove user')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    if (!organization?.id || !user?.id) return

    try {
      await OrganizationService.updateUserRole(organization.id, userId, newRole, user.id, role)
      await loadMembers()
    } catch (err) {
      console.error('Failed to update role:', err)
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const getRoleIcon = (userRole: UserRole) => {
    switch (userRole) {
      case 'OWNER':
        return <Shield className="h-4 w-4 text-purple-600" />
      case 'ADMIN':
        return <ShieldCheck className="h-4 w-4 text-blue-600" />
      case 'ANALYST':
        return <Eye className="h-4 w-4 text-green-600" />
      case 'VIEWER':
        return <EyeOff className="h-4 w-4 text-gray-600" />
      default:
        return <UserPlus className="h-4 w-4 text-gray-400" />
    }
  }

  const getRoleColor = (userRole: UserRole) => {
    switch (userRole) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800'
      case 'ANALYST':
        return 'bg-green-100 text-green-800'
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!PermissionChecker.can(role, 'read', 'manage_users', organization?.id || '')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to manage members.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage who has access to your organization and what they can do.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {members.map((member) => (
            <li key={member.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {member.userEmail.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {member.userEmail}
                    </div>
                    <div className="text-sm text-gray-500">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                    {getRoleIcon(member.role)}
                    <span className="ml-1">{member.role}</span>
                  </span>
                  {PermissionChecker.can(role, 'update', 'manage_users', organization?.id || '') && member.role !== 'OWNER' && (
                    <div className="relative">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.userId, e.target.value as UserRole)}
                        className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="ANALYST">Analyst</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  )}
                  {PermissionChecker.can(role, 'delete', 'manage_users', organization?.id || '') && member.role !== 'OWNER' && (
                    <button
                      onClick={() => handleRemoveUser(member.userId)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New Member</h3>
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="ANALYST">Analyst</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {inviteLoading ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MembersManagement