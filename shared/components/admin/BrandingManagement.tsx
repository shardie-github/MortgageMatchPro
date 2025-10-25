import React, { useState, useEffect } from 'react'
import { useTenantContext } from '@/lib/tenancy/context'
import { OrganizationService } from '@/lib/tenancy/organization-service'
import { PermissionChecker } from '@/lib/tenancy/rbac'
import { OrganizationBranding } from '@/lib/types/tenancy'
import { 
  Upload, 
  Palette, 
  Type, 
  Globe, 
  Save,
  Eye,
  RefreshCw
} from 'lucide-react'

const BrandingManagement: React.FC = () => {
  const { organization, user, role } = useTenantContext()
  const [branding, setBranding] = useState<OrganizationBranding>({
    logoUrl: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#F59E0B',
    fontFamily: 'Inter',
    customCss: '',
    faviconUrl: '',
    customDomain: '',
    termsUrl: '',
    privacyUrl: '',
    supportEmail: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBranding()
  }, [organization?.id])

  const loadBranding = async () => {
    if (!organization?.id || !user?.id) return

    try {
      setLoading(true)
      const org = await OrganizationService.getOrganization(organization.id, user.id, role)
      if (org.branding) {
        setBranding(org.branding)
      }
    } catch (err) {
      console.error('Failed to load branding:', err)
      setError('Failed to load branding settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!organization?.id || !user?.id) return

    try {
      setSaving(true)
      setError(null)

      await OrganizationService.updateBranding(
        organization.id,
        branding,
        user.id,
        role
      )

      // Apply theme to preview
      if (previewMode) {
        applyThemeToPreview()
      }
    } catch (err) {
      console.error('Failed to save branding:', err)
      setError(err instanceof Error ? err.message : 'Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  const applyThemeToPreview = () => {
    const root = document.documentElement
    root.style.setProperty('--primary-color', branding.primaryColor)
    root.style.setProperty('--secondary-color', branding.secondaryColor)
    root.style.setProperty('--accent-color', branding.accentColor)
    root.style.setProperty('--font-family', branding.fontFamily)
  }

  const handleColorChange = (field: keyof OrganizationBranding, value: string) => {
    setBranding(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileUpload = async (field: 'logoUrl' | 'faviconUrl', file: File) => {
    // In a real implementation, you would upload to a file storage service
    // For now, we'll create a data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      handleColorChange(field, result)
    }
    reader.readAsDataURL(file)
  }

  if (!PermissionChecker.can(role, 'read', 'manage_branding', organization?.id || '')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to manage branding.</p>
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
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Branding</h1>
          <p className="mt-2 text-sm text-gray-700">
            Customize your organization's appearance and branding.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Exit Preview' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branding Settings */}
        <div className="space-y-6">
          {/* Logo */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Logo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={branding.logoUrl}
                  onChange={(e) => handleColorChange('logoUrl', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload('logoUrl', file)
                  }}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {branding.logoUrl && (
                <div className="mt-4">
                  <img
                    src={branding.logoUrl}
                    alt="Logo preview"
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Colors */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Colors</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="h-10 w-20 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={branding.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={branding.secondaryColor}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    className="h-10 w-20 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={branding.secondaryColor}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={branding.accentColor}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="h-10 w-20 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={branding.accentColor}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Typography</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Family
              </label>
              <select
                value={branding.fontFamily}
                onChange={(e) => handleColorChange('fontFamily', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Montserrat">Montserrat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: branding.primaryColor }}>
                <h4 className="text-white font-semibold">Primary Color</h4>
                <p className="text-white text-sm opacity-90">This is how your primary color will look</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: branding.secondaryColor }}>
                <h4 className="text-white font-semibold">Secondary Color</h4>
                <p className="text-white text-sm opacity-90">This is how your secondary color will look</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: branding.accentColor }}>
                <h4 className="text-white font-semibold">Accent Color</h4>
                <p className="text-white text-sm opacity-90">This is how your accent color will look</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-gray-900" style={{ fontFamily: branding.fontFamily }}>
                  Typography Preview
                </h4>
                <p className="text-sm text-gray-600" style={{ fontFamily: branding.fontFamily }}>
                  This is how your chosen font will look in your application.
                </p>
              </div>
            </div>
          </div>

          {/* Custom Domain */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Domain</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain
              </label>
              <input
                type="text"
                value={branding.customDomain}
                onChange={(e) => handleColorChange('customDomain', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="app.yourcompany.com"
              />
              <p className="mt-2 text-sm text-gray-500">
                Set up a custom domain for your white-label experience.
              </p>
            </div>
          </div>

          {/* Legal Links */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Legal Links</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms of Service URL
                </label>
                <input
                  type="url"
                  value={branding.termsUrl}
                  onChange={(e) => handleColorChange('termsUrl', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://yourcompany.com/terms"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Privacy Policy URL
                </label>
                <input
                  type="url"
                  value={branding.privacyUrl}
                  onChange={(e) => handleColorChange('privacyUrl', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://yourcompany.com/privacy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Email
                </label>
                <input
                  type="email"
                  value={branding.supportEmail}
                  onChange={(e) => handleColorChange('supportEmail', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="support@yourcompany.com"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrandingManagement