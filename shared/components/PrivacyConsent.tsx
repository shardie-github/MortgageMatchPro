'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  Eye, 
  Database, 
  Mail, 
  BarChart3, 
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { setAnalyticsConsent, getAnalyticsConsent } from '@/lib/analytics'

interface PrivacySettings {
  analytics: boolean
  marketing: boolean
  data_processing: boolean
}

export default function PrivacyConsent() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<PrivacySettings>({
    analytics: false,
    marketing: false,
    data_processing: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPrivacySettings()
  }, [user])

  const loadPrivacySettings = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      // Load from database
      const { data, error } = await supabase
        .from('privacy_consent')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      const consentSettings: PrivacySettings = {
        analytics: false,
        marketing: false,
        data_processing: false,
      }

      data?.forEach(consent => {
        if (consent.consent_type === 'analytics') {
          consentSettings.analytics = consent.consent_given
        } else if (consent.consent_type === 'marketing') {
          consentSettings.marketing = consent.consent_given
        } else if (consent.consent_type === 'data_processing') {
          consentSettings.data_processing = consent.consent_given
        }
      })

      setSettings(consentSettings)
      
      // Also check PostHog consent
      const analyticsConsent = getAnalyticsConsent()
      if (analyticsConsent !== consentSettings.analytics) {
        setAnalyticsConsent(consentSettings.analytics)
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = async (type: keyof PrivacySettings, value: boolean) => {
    if (!user) return

    setSaving(true)
    try {
      // Update in database
      const { error } = await supabase
        .from('privacy_consent')
        .upsert({
          user_id: user.id,
          consent_type: type,
          consent_given: value,
          consent_method: 'explicit',
          ip_address: null, // Would be set server-side
          user_agent: navigator.userAgent,
        })

      if (error) throw error

      // Update local state
      setSettings(prev => ({ ...prev, [type]: value }))

      // Update PostHog consent for analytics
      if (type === 'analytics') {
        setAnalyticsConsent(value)
      }

    } catch (error) {
      console.error('Error updating privacy setting:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading privacy settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold">Privacy & Data Settings</h1>
        <p className="text-muted-foreground mt-2">
          Control how your data is used and processed
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Analytics Consent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics & Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="analytics">Enable Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Help us improve the platform by sharing anonymous usage data
                </p>
              </div>
              <Switch
                id="analytics"
                checked={settings.analytics}
                onCheckedChange={(value) => handleSettingChange('analytics', value)}
                disabled={saving}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>When enabled, we collect:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Page views and navigation patterns</li>
                <li>Feature usage and interactions</li>
                <li>Performance metrics and errors</li>
                <li>Device and browser information</li>
              </ul>
              <p className="text-xs">
                All data is anonymized and cannot be traced back to you personally.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Marketing Consent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Marketing Communications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="marketing">Receive Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">
                  Get updates about new features and mortgage market insights
                </p>
              </div>
              <Switch
                id="marketing"
                checked={settings.marketing}
                onCheckedChange={(value) => handleSettingChange('marketing', value)}
                disabled={saving}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>When enabled, you may receive:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Product updates and new features</li>
                <li>Market insights and rate alerts</li>
                <li>Educational content about mortgages</li>
                <li>Promotional offers (occasionally)</li>
              </ul>
              <p className="text-xs">
                You can unsubscribe at any time using the link in our emails.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Processing Consent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="data_processing">Essential Data Processing</Label>
                <p className="text-sm text-muted-foreground">
                  Required for core platform functionality
                </p>
              </div>
              <Switch
                id="data_processing"
                checked={settings.data_processing}
                onCheckedChange={(value) => handleSettingChange('data_processing', value)}
                disabled={saving}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This includes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>User account and authentication data</li>
                <li>Mortgage calculations and scenarios</li>
                <li>Lead generation and broker matching</li>
                <li>Payment processing and billing</li>
              </ul>
              <p className="text-xs text-red-600">
                Note: Disabling this will limit platform functionality.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">GDPR Compliant</p>
                  <p className="text-xs text-muted-foreground">
                    Full compliance with EU General Data Protection Regulation
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">PIPEDA Compliant</p>
                  <p className="text-xs text-muted-foreground">
                    Compliant with Canadian Personal Information Protection Act
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">CCPA Compliant</p>
                  <p className="text-xs text-muted-foreground">
                    Compliant with California Consumer Privacy Act
                  </p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2 text-sm">
              <p className="font-medium">Your Rights:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and data</li>
                <li>Export your data</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </div>
            
            <Button variant="outline" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              View Privacy Policy
            </Button>
          </CardContent>
        </Card>
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Saving settings...</span>
          </div>
        </div>
      )}
    </div>
  )
}
