'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Star, Phone, Mail, Building, CheckCircle, AlertTriangle, Shield } from 'lucide-react'
import { z } from 'zod'

// Zod validation schema
const leadFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  propertyValue: z.number().min(10000, 'Property value must be at least $10,000'),
  downPayment: z.number().min(0, 'Down payment cannot be negative'),
  income: z.number().min(0, 'Income cannot be negative'),
  employmentType: z.enum(['salaried', 'self-employed', 'contract', 'unemployed']),
  creditScore: z.number().min(300).max(850, 'Credit score must be between 300 and 850'),
  preferredLender: z.string().optional(),
  additionalInfo: z.string().optional(),
  consentToShare: z.boolean().refine(val => val === true, 'You must consent to share your information with lenders'),
  consentToContact: z.boolean().refine(val => val === true, 'You must consent to be contacted by lenders')
})

export type LeadFormData = z.infer<typeof leadFormSchema>

interface BrokerRecommendation {
  brokerId: string
  name: string
  company: string
  commissionRate: number
  matchReason: string
  phone: string
  email: string
}

interface LeadGenModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: LeadFormData) => void
  brokerRecommendations: BrokerRecommendation[]
  leadScore: number
  loading?: boolean
  userProfile?: {
    name?: string
    email?: string
    phone?: string
  }
}

export function LeadGenModal({
  isOpen,
  onClose,
  onSubmit,
  brokerRecommendations,
  leadScore,
  loading = false,
  userProfile,
}: LeadGenModalProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    name: userProfile?.name || '',
    email: userProfile?.email || '',
    phone: userProfile?.phone || '',
    propertyValue: 0,
    downPayment: 0,
    income: 0,
    employmentType: 'salaried',
    creditScore: 700,
    preferredLender: '',
    additionalInfo: '',
    consentToShare: false,
    consentToContact: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const validatedData = leadFormSchema.parse(formData)
      setErrors({})
      onSubmit(validatedData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
      }
    }
  }

  const handleInputChange = (field: keyof LeadFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'High Quality Lead'
    if (score >= 60) return 'Medium Quality Lead'
    return 'Low Quality Lead'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Connect with Mortgage Brokers</DialogTitle>
          <p className="text-muted-foreground">
            Get matched with qualified brokers who can help you secure the best mortgage rates
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Your Lead Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(leadScore)}`}>
                  {leadScore}/100 - {getScoreLabel(leadScore)}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${leadScore}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Broker Recommendations */}
          {brokerRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommended Brokers</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Based on your profile and requirements
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {brokerRecommendations.map((broker, index) => (
                    <div key={broker.brokerId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Building className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{broker.name}</h3>
                          <p className="text-sm text-muted-foreground">{broker.company}</p>
                          <p className="text-xs text-muted-foreground mt-1">{broker.matchReason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-2">
                          {broker.commissionRate}% commission
                        </Badge>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Phone className="h-4 w-4 mr-1" />
                            Call
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fill out your information to connect with qualified mortgage brokers
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter your full name"
                        className={errors.name ? 'border-red-500' : ''}
                      />
                      {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email"
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                  </div>
                </div>

                {/* Financial Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Financial Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="propertyValue">Property Value *</Label>
                      <Input
                        id="propertyValue"
                        type="number"
                        value={formData.propertyValue || ''}
                        onChange={(e) => handleInputChange('propertyValue', parseFloat(e.target.value) || 0)}
                        placeholder="Enter property value"
                        className={errors.propertyValue ? 'border-red-500' : ''}
                      />
                      {errors.propertyValue && <p className="text-sm text-red-500">{errors.propertyValue}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="downPayment">Down Payment *</Label>
                      <Input
                        id="downPayment"
                        type="number"
                        value={formData.downPayment || ''}
                        onChange={(e) => handleInputChange('downPayment', parseFloat(e.target.value) || 0)}
                        placeholder="Enter down payment amount"
                        className={errors.downPayment ? 'border-red-500' : ''}
                      />
                      {errors.downPayment && <p className="text-sm text-red-500">{errors.downPayment}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="income">Annual Income *</Label>
                      <Input
                        id="income"
                        type="number"
                        value={formData.income || ''}
                        onChange={(e) => handleInputChange('income', parseFloat(e.target.value) || 0)}
                        placeholder="Enter annual income"
                        className={errors.income ? 'border-red-500' : ''}
                      />
                      {errors.income && <p className="text-sm text-red-500">{errors.income}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="creditScore">Credit Score *</Label>
                      <Input
                        id="creditScore"
                        type="number"
                        min="300"
                        max="850"
                        value={formData.creditScore || ''}
                        onChange={(e) => handleInputChange('creditScore', parseFloat(e.target.value) || 0)}
                        placeholder="Enter credit score (300-850)"
                        className={errors.creditScore ? 'border-red-500' : ''}
                      />
                      {errors.creditScore && <p className="text-sm text-red-500">{errors.creditScore}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employmentType">Employment Type *</Label>
                    <Select
                      value={formData.employmentType}
                      onValueChange={(value) => handleInputChange('employmentType', value)}
                    >
                      <SelectTrigger className={errors.employmentType ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salaried">Salaried Employee</SelectItem>
                        <SelectItem value="self-employed">Self-Employed</SelectItem>
                        <SelectItem value="contract">Contract Worker</SelectItem>
                        <SelectItem value="unemployed">Unemployed</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.employmentType && <p className="text-sm text-red-500">{errors.employmentType}</p>}
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Preferences</h3>
                  <div className="space-y-2">
                    <Label htmlFor="preferredLender">Preferred Lender/Broker (Optional)</Label>
                    <Input
                      id="preferredLender"
                      value={formData.preferredLender}
                      onChange={(e) => handleInputChange('preferredLender', e.target.value)}
                      placeholder="Enter preferred lender or broker name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
                    <Textarea
                      id="additionalInfo"
                      value={formData.additionalInfo}
                      onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                      placeholder="Any additional information that might help brokers assist you"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Consent and Privacy */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Consent & Privacy</h3>
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="consentToShare"
                        checked={formData.consentToShare}
                        onChange={(e) => handleInputChange('consentToShare', e.target.checked)}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="consentToShare" className="text-sm font-medium">
                          I consent to share my information with qualified mortgage brokers and lenders *
                        </Label>
                        <p className="text-xs text-gray-600">
                          This allows us to match you with the best mortgage professionals for your needs.
                        </p>
                        {errors.consentToShare && <p className="text-sm text-red-500">{errors.consentToShare}</p>}
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="consentToContact"
                        checked={formData.consentToContact}
                        onChange={(e) => handleInputChange('consentToContact', e.target.checked)}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="consentToContact" className="text-sm font-medium">
                          I consent to be contacted by mortgage brokers via phone, email, or SMS *
                        </Label>
                        <p className="text-xs text-gray-600">
                          Brokers may contact you to discuss your mortgage options and provide personalized assistance.
                        </p>
                        {errors.consentToContact && <p className="text-sm text-red-500">{errors.consentToContact}</p>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Privacy Notice */}
                  <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Privacy Notice</p>
                      <p>
                        Your information is encrypted and stored securely. We only share data with verified, licensed mortgage professionals. 
                        You can request data deletion at any time. Sharing information with lenders does not guarantee mortgage approval.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Connect with Brokers
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Why Connect with Brokers?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-1">Best Rates</h3>
                  <p className="text-sm text-muted-foreground">
                    Access to exclusive rates from multiple lenders
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Star className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-1">Expert Guidance</h3>
                  <p className="text-sm text-muted-foreground">
                    Professional advice throughout the process
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Building className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-1">Save Time</h3>
                  <p className="text-sm text-muted-foreground">
                    Let brokers handle the paperwork and negotiations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}