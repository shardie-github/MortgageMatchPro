'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Phone, Mail, Building, CheckCircle } from 'lucide-react'

export interface LeadFormData {
  name: string
  email: string
  phone: string
}

interface BrokerRecommendation {
  brokerId: string
  name: string
  company: string
  commissionRate: number
  matchReason: string
}

interface LeadGenModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: LeadFormData) => void
  brokerRecommendations: BrokerRecommendation[]
  leadScore: number
  loading?: boolean
}

export function LeadGenModal({
  isOpen,
  onClose,
  onSubmit,
  brokerRecommendations,
  leadScore,
  loading = false,
}: LeadGenModalProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    phone: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
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
                Fill out your contact information to connect with brokers
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                    required
                  />
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