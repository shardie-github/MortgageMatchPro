'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, Phone, Mail, ExternalLink, Star } from 'lucide-react'

interface RateResult {
  lender: string
  rate: number
  apr: number
  term: number
  type: 'fixed' | 'variable'
  paymentEstimate: number
  features: string[]
  contactInfo: {
    phone: string
    email: string
    website: string
  }
}

interface RateComparisonTableProps {
  rates: RateResult[]
  loading?: boolean
  onContactLender?: (lender: string) => void
}

export function RateComparisonTable({ rates, loading = false, onContactLender }: RateComparisonTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value)
  }

  const formatRate = (rate: number) => {
    return `${rate.toFixed(3)}%`
  }

  const getRateTypeColor = (type: 'fixed' | 'variable') => {
    return type === 'fixed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
  }

  const getBestRate = () => {
    if (rates.length === 0) return null
    return rates.reduce((best, current) => 
      current.rate < best.rate ? current : best
    )
  }

  const bestRate = getBestRate()

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Current Mortgage Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-2">Loading rates...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (rates.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Current Mortgage Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No rates available at the moment. Please try again later.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Current Mortgage Rates
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time rates from top lenders • Updated every hour
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lender</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>APR</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Monthly Payment</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate, index) => (
                <TableRow key={index} className={bestRate?.lender === rate.lender ? 'bg-green-50' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {rate.lender}
                      {bestRate?.lender === rate.lender && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <Star className="h-3 w-3 mr-1" />
                          Best Rate
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-lg">
                    {formatRate(rate.rate)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatRate(rate.apr)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getRateTypeColor(rate.type)}>
                      {rate.type.charAt(0).toUpperCase() + rate.type.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(rate.paymentEstimate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rate.features.slice(0, 2).map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {rate.features.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{rate.features.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs">
                        <Phone className="h-3 w-3" />
                        <span>{rate.contactInfo.phone}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-20">{rate.contactInfo.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onContactLender?.(rate.lender)}
                      >
                        Contact
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(rate.contactInfo.website, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <p>💡 <strong>Tip:</strong> Rates are subject to change and approval. Contact lenders directly for final rates.</p>
            </div>
            <div className="text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}