'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Calculator, DollarSign, Home, TrendingUp } from 'lucide-react'

interface AffordabilityInputPanelProps {
  onCalculate: (data: AffordabilityInput) => void
  loading?: boolean
}

export interface AffordabilityInput {
  country: 'CA' | 'US'
  income: number
  debts: number
  downPayment: number
  propertyPrice: number
  interestRate: number
  termYears: number
  location: string
  taxes?: number
  insurance?: number
  hoa?: number
}

export function AffordabilityInputPanel({ onCalculate, loading = false }: AffordabilityInputPanelProps) {
  const [formData, setFormData] = useState<AffordabilityInput>({
    country: 'CA',
    income: 75000,
    debts: 500,
    downPayment: 50000,
    propertyPrice: 500000,
    interestRate: 5.5,
    termYears: 25,
    location: '',
    taxes: 0,
    insurance: 0,
    hoa: 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCalculate(formData)
  }

  const handleSliderChange = (field: keyof AffordabilityInput, value: number[]) => {
    setFormData(prev => ({ ...prev, [field]: value[0] }))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: formData.country === 'CA' ? 'CAD' : 'USD',
    }).format(value)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Mortgage Affordability Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Calculate how much you can afford based on your income and financial situation
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Country Selection */}
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              value={formData.country}
              onValueChange={(value: 'CA' | 'US') => setFormData(prev => ({ ...prev, country: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="US">United States</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (Province/State)</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Ontario, California"
              required
            />
          </div>

          {/* Income */}
          <div className="space-y-2">
            <Label htmlFor="income">Annual Income</Label>
            <div className="space-y-2">
              <Slider
                value={[formData.income]}
                onValueChange={(value) => handleSliderChange('income', value)}
                min={30000}
                max={500000}
                step={5000}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(30000)}</span>
                <span className="font-medium">{formatCurrency(formData.income)}</span>
                <span>{formatCurrency(500000)}</span>
              </div>
            </div>
          </div>

          {/* Debts */}
          <div className="space-y-2">
            <Label htmlFor="debts">Monthly Debt Payments</Label>
            <div className="space-y-2">
              <Slider
                value={[formData.debts]}
                onValueChange={(value) => handleSliderChange('debts', value)}
                min={0}
                max={5000}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(0)}</span>
                <span className="font-medium">{formatCurrency(formData.debts)}</span>
                <span>{formatCurrency(5000)}</span>
              </div>
            </div>
          </div>

          {/* Down Payment */}
          <div className="space-y-2">
            <Label htmlFor="downPayment">Down Payment</Label>
            <div className="space-y-2">
              <Slider
                value={[formData.downPayment]}
                onValueChange={(value) => handleSliderChange('downPayment', value)}
                min={0}
                max={formData.propertyPrice}
                step={5000}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(0)}</span>
                <span className="font-medium">{formatCurrency(formData.downPayment)}</span>
                <span>{formatCurrency(formData.propertyPrice)}</span>
              </div>
            </div>
          </div>

          {/* Property Price */}
          <div className="space-y-2">
            <Label htmlFor="propertyPrice">Property Price</Label>
            <div className="space-y-2">
              <Slider
                value={[formData.propertyPrice]}
                onValueChange={(value) => handleSliderChange('propertyPrice', value)}
                min={100000}
                max={2000000}
                step={10000}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(100000)}</span>
                <span className="font-medium">{formatCurrency(formData.propertyPrice)}</span>
                <span>{formatCurrency(2000000)}</span>
              </div>
            </div>
          </div>

          {/* Interest Rate */}
          <div className="space-y-2">
            <Label htmlFor="interestRate">Interest Rate (%)</Label>
            <div className="space-y-2">
              <Slider
                value={[formData.interestRate]}
                onValueChange={(value) => handleSliderChange('interestRate', value)}
                min={1}
                max={10}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>1%</span>
                <span className="font-medium">{formData.interestRate}%</span>
                <span>10%</span>
              </div>
            </div>
          </div>

          {/* Term Years */}
          <div className="space-y-2">
            <Label htmlFor="termYears">Amortization Period (Years)</Label>
            <Select
              value={formData.termYears.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, termYears: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 years</SelectItem>
                <SelectItem value="20">20 years</SelectItem>
                <SelectItem value="25">25 years</SelectItem>
                <SelectItem value="30">30 years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Costs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxes">Property Taxes (Monthly)</Label>
              <Input
                id="taxes"
                type="number"
                value={formData.taxes || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, taxes: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insurance">Insurance (Monthly)</Label>
              <Input
                id="insurance"
                type="number"
                value={formData.insurance || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, insurance: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hoa">HOA/Condo Fees (Monthly)</Label>
              <Input
                id="hoa"
                type="number"
                value={formData.hoa || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, hoa: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Affordability
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}