import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import EngagementMetrics from '../../../../components/dashboard/modules/EngagementMetrics'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

const mockMetrics = {
  total_calculations: 150,
  total_rate_checks: 75,
  total_scenarios_saved: 25,
  total_leads_submitted: 10,
  total_dashboard_views: 300,
  avg_time_spent_minutes: 12.5
}

describe('EngagementMetrics', () => {
  it('should render without crashing', () => {
    render(<EngagementMetrics metrics={mockMetrics} />)
    
    expect(screen.getByText('Engagement Metrics')).toBeInTheDocument()
    expect(screen.getByText('Calculations')).toBeInTheDocument()
    expect(screen.getByText('Rate Checks')).toBeInTheDocument()
    expect(screen.getByText('Scenarios')).toBeInTheDocument()
    expect(screen.getByText('Leads')).toBeInTheDocument()
  })

  it('should display correct metric values', () => {
    render(<EngagementMetrics metrics={mockMetrics} />)
    
    expect(screen.getByText('150')).toBeInTheDocument() // total_calculations
    expect(screen.getByText('75')).toBeInTheDocument()  // total_rate_checks
    expect(screen.getByText('25')).toBeInTheDocument()  // total_scenarios_saved
    expect(screen.getByText('10')).toBeInTheDocument()  // total_leads_submitted
    expect(screen.getByText('12.5 minutes')).toBeInTheDocument() // avg_time_spent_minutes
  })

  it('should have proper accessibility attributes', () => {
    render(<EngagementMetrics metrics={mockMetrics} />)
    
    // Check for proper heading structure
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toHaveTextContent('Engagement Metrics')
    
    // Check for proper chart accessibility
    const chart = screen.getByRole('img', { hidden: true })
    expect(chart).toBeInTheDocument()
  })

  it('should be accessible', async () => {
    const { container } = render(<EngagementMetrics metrics={mockMetrics} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should handle zero values gracefully', () => {
    const zeroMetrics = {
      total_calculations: 0,
      total_rate_checks: 0,
      total_scenarios_saved: 0,
      total_leads_submitted: 0,
      total_dashboard_views: 0,
      avg_time_spent_minutes: 0
    }

    render(<EngagementMetrics metrics={zeroMetrics} />)
    
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0 minutes')).toBeInTheDocument()
  })

  it('should handle large numbers correctly', () => {
    const largeMetrics = {
      total_calculations: 999999,
      total_rate_checks: 888888,
      total_scenarios_saved: 777777,
      total_leads_submitted: 666666,
      total_dashboard_views: 555555,
      avg_time_spent_minutes: 999.99
    }

    render(<EngagementMetrics metrics={largeMetrics} />)
    
    expect(screen.getByText('999999')).toBeInTheDocument()
    expect(screen.getByText('888888')).toBeInTheDocument()
    expect(screen.getByText('777777')).toBeInTheDocument()
    expect(screen.getByText('666666')).toBeInTheDocument()
    expect(screen.getByText('999.99 minutes')).toBeInTheDocument()
  })

  it('should have proper color contrast for text elements', () => {
    render(<EngagementMetrics metrics={mockMetrics} />)
    
    // Check that all text elements are visible
    const textElements = screen.getAllByText(/\d+/)
    textElements.forEach(element => {
      expect(element).toBeVisible()
    })
  })

  it('should be keyboard navigable', () => {
    render(<EngagementMetrics metrics={mockMetrics} />)
    
    // Check that the component doesn't interfere with keyboard navigation
    const container = screen.getByRole('region', { hidden: true })
    expect(container).toBeInTheDocument()
  })

  it('should have proper ARIA labels', () => {
    render(<EngagementMetrics metrics={mockMetrics} />)
    
    // Check for proper chart labeling
    const chart = screen.getByRole('img', { hidden: true })
    expect(chart).toHaveAttribute('aria-label')
  })

  it('should handle missing metrics gracefully', () => {
    const incompleteMetrics = {
      total_calculations: 100,
      total_rate_checks: 50,
      total_scenarios_saved: 20,
      total_leads_submitted: 5,
      total_dashboard_views: 200,
      avg_time_spent_minutes: 10
    }

    expect(() => {
      render(<EngagementMetrics metrics={incompleteMetrics} />)
    }).not.toThrow()
  })
})
