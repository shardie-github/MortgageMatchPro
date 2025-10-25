import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AffordabilityInputPanel } from '@/components/canvas/AffordabilityInputPanel'

const mockOnCalculate = jest.fn()

describe('AffordabilityInputPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<AffordabilityInputPanel onCalculate={mockOnCalculate} />)
    
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/annual income/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/monthly debt payments/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/down payment/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/property price/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/interest rate/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amortization period/i)).toBeInTheDocument()
  })

  it('updates form values when sliders are moved', () => {
    render(<AffordabilityInputPanel onCalculate={mockOnCalculate} />)
    
    const incomeSlider = screen.getByRole('slider', { name: /annual income/i })
    fireEvent.change(incomeSlider, { target: { value: '100000' } })
    
    expect(incomeSlider).toHaveValue(100000)
  })

  it('calls onCalculate with form data when submitted', async () => {
    render(<AffordabilityInputPanel onCalculate={mockOnCalculate} />)
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/location/i), { 
      target: { value: 'Toronto, ON' } 
    })
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /calculate affordability/i }))
    
    await waitFor(() => {
      expect(mockOnCalculate).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'CA',
          income: 75000,
          debts: 500,
          downPayment: 50000,
          propertyPrice: 500000,
          interestRate: 5.5,
          termYears: 25,
          location: 'Toronto, ON',
        })
      )
    })
  })

  it('shows loading state when calculating', () => {
    render(<AffordabilityInputPanel onCalculate={mockOnCalculate} loading={true} />)
    
    expect(screen.getByText(/calculating/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /calculating/i })).toBeDisabled()
  })

  it('validates required fields', async () => {
    render(<AffordabilityInputPanel onCalculate={mockOnCalculate} />)
    
    // Try to submit without filling location
    fireEvent.click(screen.getByRole('button', { name: /calculate affordability/i }))
    
    await waitFor(() => {
      expect(mockOnCalculate).not.toHaveBeenCalled()
    })
  })

  it('formats currency values correctly', () => {
    render(<AffordabilityInputPanel onCalculate={mockOnCalculate} />)
    
    // Check that currency formatting is applied
    const incomeDisplay = screen.getByText('$75,000')
    expect(incomeDisplay).toBeInTheDocument()
  })
})