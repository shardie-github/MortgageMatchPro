'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, Star, Phone, Mail, Building, Award } from 'lucide-react'

interface BrokerRecommendation {
  brokerId: string
  name: string
  company: string
  commissionRate: number
  matchReason: string
  phone: string
  email: string
  rating: number
  experience: string
  specialties: string[]
}

interface LeadGenModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: LeadFormData) => void
  brokerRecommendations?: BrokerRecommendation[]
  leadScore?: number
  loading?: boolean
}

export interface LeadFormData {
  name: string
  email: string
  phone: string
  preferredContact: 'phone' | 'email' | 'either'
  message?: string
  timeline: 'immediate' | '1-3 months' | '3-6 months' | '6+ months'
  propertyType: 'house' | 'condo' | 'townhouse' | 'other'
  budget: string
  location: string
}

export function LeadGenModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  brokerRecommendations = [], 
  leadScore = 0,
  loading = false 
}: LeadGenModalProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    phone: '',
    preferredContact: 'either',
    message: '',
    timeline: '1-3 months',
    propertyType: 'house',
    budget: '',
    location: '',
  })

  const [selectedBroker, setSelectedBroker] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ ...formData, selectedBroker })
  }

  const getLeadScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800'
    if (score >= 50) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getLeadScoreLabel = (score: number) => {
    if (score >= 70) return 'High Priority'
    if (score >= 50) return 'Medium Priority'
    return 'Needs Improvement'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            Connect with Mortgage Professionals
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Get matched with qualified brokers and lenders in your area
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Score Display */}
          {leadScore > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Your Lead Score</h3>
                    <p className="text-sm text-muted-foreground">
                      Based on your financial profile
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={`${getLeadScoreColor(leadScore)} text-lg px-3 py-1`}>
                      {leadScore}/100
                    </Badge>
                    <p className="text-sm font-medium mt-1">
                      {getLeadScoreLabel(leadScore)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Broker Recommendations */}
          {brokerRecommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Recommended Brokers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brokerRecommendations.map((broker) => (
                  <Card 
                    key={broker.brokerId}
                    className={`cursor-pointer transition-all ${
                      selectedBroker === broker.brokerId 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedBroker(broker.brokerId)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{broker.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{broker.company}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{broker.rating}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span>{broker.experience}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{broker.commissionRate}% commission</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {broker.matchReason}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {broker.specialties.slice(0, 3).map((specialty, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredContact">Preferred Contact Method</Label>
                <Select
                  value={formData.preferredContact}
                  onValueChange={(value: 'phone' | 'email' | 'either') => 
                    setFormData(prev => ({ ...prev, preferredContact: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="either">Either</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeline">When are you looking to buy?</Label>
                <Select
                  value={formData.timeline}
                  onValueChange={(value: 'immediate' | '1-3 months' | '3-6 months' | '6+ months') => 
                    setFormData(prev => ({ ...prev, timeline: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediately</SelectItem>
                    <SelectItem value="1-3 months">1-3 months</SelectItem>
                    <SelectItem value="3-6 months">3-6 months</SelectItem>
                    <SelectItem value="6+ months">6+ months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value: 'house' | 'condo' | 'townhouse' | 'other') => 
                    setFormData(prev => ({ ...prev, propertyType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget Range</Label>
                <Input
                  id="budget"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="e.g., $500,000 - $750,000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Preferred Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Toronto, ON"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Additional Message (Optional)</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Tell us about your specific needs or questions..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !selectedBroker}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Lead
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}