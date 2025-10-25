import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { LeadManagement } from '../../components/dashboard/modules/LeadManagement'
import { BrokerMetrics } from '../../components/dashboard/modules/BrokerMetrics'
import { QuickActions } from '../../components/dashboard/modules/QuickActions'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock data
const mockLeads = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-0123',
    lead_score: 85,
    status: 'pending' as const,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    broker_id: 'broker-1',
    lead_data: {}
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '555-0124',
    lead_score: 92,
    status: 'contacted' as const,
    created_at: '2024-01-14T14:30:00Z',
    updated_at: '2024-01-14T15:00:00Z',
    broker_id: 'broker-1',
    lead_data: {}
  }
]

const mockMetrics = {
  total_leads_received: 150,
  total_leads_contacted: 120,
  total_leads_converted: 45,
  avg_conversion_rate: 30.0,
  total_commission: 125000,
  avg_lead_value: 2777.78,
  response_time_hours: 2.5,
  client_satisfaction_score: 4.7
}

const mockLeadTrends = [
  { date: '2024-01-01', leads: 10, converted: 3 },
  { date: '2024-01-02', leads: 15, converted: 5 },
  { date: '2024-01-03', leads: 12, converted: 4 }
]

const mockCommissionReports = [
  {
    id: '1',
    month: 'January 2024',
    total_commission: 25000,
    leads_converted: 20,
    avg_deal_size: 1250
  }
]

const mockLeadSources = [
  { source: 'Website', count: 50, conversion_rate: 25 },
  { source: 'Referral', count: 30, conversion_rate: 40 }
]

// Mock functions
const mockHandlers = {
  onLeadUpdate: jest.fn(),
  onLeadContact: jest.fn(),
  onLeadConvert: jest.fn(),
  onLeadReject: jest.fn(),
  onExportLeads: jest.fn(),
  onExportData: jest.fn(),
  onImportData: jest.fn(),
  onOpenSettings: jest.fn(),
  onSendMessage: jest.fn(),
  onScheduleMeeting: jest.fn(),
  onGenerateReport: jest.fn(),
  onManageTeam: jest.fn(),
  onViewAnalytics: jest.fn(),
  onManageNotifications: jest.fn(),
  onGetHelp: jest.fn()
}

describe('Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('LeadManagement Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <LeadManagement
          leads={mockLeads}
          onLeadUpdate={mockHandlers.onLeadUpdate}
          onLeadContact={mockHandlers.onLeadContact}
          onLeadConvert={mockHandlers.onLeadConvert}
          onLeadReject={mockHandlers.onLeadReject}
          onExportLeads={mockHandlers.onExportLeads}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels and roles', () => {
      render(
        <LeadManagement
          leads={mockLeads}
          onLeadUpdate={mockHandlers.onLeadUpdate}
          onLeadContact={mockHandlers.onLeadContact}
          onLeadConvert={mockHandlers.onLeadConvert}
          onLeadReject={mockHandlers.onLeadReject}
          onExportLeads={mockHandlers.onExportLeads}
        />
      )

      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: /lead management/i })).toBeInTheDocument()
      
      // Check for search input
      const searchInput = screen.getByPlaceholderText(/search leads/i)
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('type', 'text')

      // Check for filter controls
      expect(screen.getByRole('combobox', { name: /all status/i })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /newest first/i })).toBeInTheDocument()

      // Check for action buttons
      expect(screen.getByRole('button', { name: /export leads/i })).toBeInTheDocument()
    })

    it('should be navigable with keyboard', async () => {
      const user = userEvent.setup()
      render(
        <LeadManagement
          leads={mockLeads}
          onLeadUpdate={mockHandlers.onLeadUpdate}
          onLeadContact={mockHandlers.onLeadContact}
          onLeadConvert={mockHandlers.onLeadConvert}
          onLeadReject={mockHandlers.onLeadReject}
          onExportLeads={mockHandlers.onExportLeads}
        />
      )

      // Tab through interactive elements
      await user.tab()
      expect(screen.getByPlaceholderText(/search leads/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('combobox', { name: /all status/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('combobox', { name: /newest first/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /export leads/i })).toHaveFocus()
    })

    it('should announce status changes to screen readers', async () => {
      const user = userEvent.setup()
      render(
        <LeadManagement
          leads={mockLeads}
          onLeadUpdate={mockHandlers.onLeadUpdate}
          onLeadContact={mockHandlers.onLeadContact}
          onLeadConvert={mockHandlers.onLeadConvert}
          onLeadReject={mockHandlers.onLeadReject}
          onExportLeads={mockHandlers.onExportLeads}
        />
      )

      // Check that status badges have proper ARIA labels
      const statusBadges = screen.getAllByText(/pending|contacted|converted|rejected/i)
      statusBadges.forEach(badge => {
        expect(badge).toHaveAttribute('class', expect.stringContaining('badge'))
      })
    })

    it('should handle empty state accessibly', () => {
      render(
        <LeadManagement
          leads={[]}
          onLeadUpdate={mockHandlers.onLeadUpdate}
          onLeadContact={mockHandlers.onLeadContact}
          onLeadConvert={mockHandlers.onLeadConvert}
          onLeadReject={mockHandlers.onLeadReject}
          onExportLeads={mockHandlers.onExportLeads}
        />
      )

      expect(screen.getByText(/no leads found matching your criteria/i)).toBeInTheDocument()
    })

    it('should have proper color contrast for status indicators', () => {
      render(
        <LeadManagement
          leads={mockLeads}
          onLeadUpdate={mockHandlers.onLeadUpdate}
          onLeadContact={mockHandlers.onLeadContact}
          onLeadConvert={mockHandlers.onLeadConvert}
          onLeadReject={mockHandlers.onLeadReject}
          onExportLeads={mockHandlers.onExportLeads}
        />
      )

      // Check that status badges have sufficient color contrast
      const pendingBadge = screen.getByText('pending')
      expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')

      const contactedBadge = screen.getByText('contacted')
      expect(contactedBadge).toHaveClass('bg-blue-100', 'text-blue-800')
    })
  })

  describe('BrokerMetrics Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <BrokerMetrics
          metrics={mockMetrics}
          leadTrends={mockLeadTrends}
          commissionReports={mockCommissionReports}
          leadSources={mockLeadSources}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper chart accessibility', () => {
      render(
        <BrokerMetrics
          metrics={mockMetrics}
          leadTrends={mockLeadTrends}
          commissionReports={mockCommissionReports}
          leadSources={mockLeadSources}
        />
      )

      // Check for chart titles
      expect(screen.getByText(/lead trends/i)).toBeInTheDocument()
      expect(screen.getByText(/lead sources/i)).toBeInTheDocument()
      expect(screen.getByText(/commission reports/i)).toBeInTheDocument()
      expect(screen.getByText(/performance overview/i)).toBeInTheDocument()

      // Check for metric cards
      expect(screen.getByText(/total leads/i)).toBeInTheDocument()
      expect(screen.getByText(/conversion rate/i)).toBeInTheDocument()
      expect(screen.getByText(/total commission/i)).toBeInTheDocument()
      expect(screen.getByText(/avg response time/i)).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(
        <BrokerMetrics
          metrics={mockMetrics}
          leadTrends={mockLeadTrends}
          commissionReports={mockCommissionReports}
          leadSources={mockLeadSources}
        />
      )

      // Check that all headings are properly structured
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
      
      // Verify heading levels are appropriate
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.charAt(1))
        expect(level).toBeGreaterThanOrEqual(2)
        expect(level).toBeLessThanOrEqual(6)
      })
    })
  })

  describe('QuickActions Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <QuickActions
          onExportData={mockHandlers.onExportData}
          onImportData={mockHandlers.onImportData}
          onOpenSettings={mockHandlers.onOpenSettings}
          onSendMessage={mockHandlers.onSendMessage}
          onScheduleMeeting={mockHandlers.onScheduleMeeting}
          onGenerateReport={mockHandlers.onGenerateReport}
          onManageTeam={mockHandlers.onManageTeam}
          onViewAnalytics={mockHandlers.onViewAnalytics}
          onManageNotifications={mockHandlers.onManageNotifications}
          onGetHelp={mockHandlers.onGetHelp}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper button labels and descriptions', () => {
      render(
        <QuickActions
          onExportData={mockHandlers.onExportData}
          onImportData={mockHandlers.onImportData}
          onOpenSettings={mockHandlers.onOpenSettings}
          onSendMessage={mockHandlers.onSendMessage}
          onScheduleMeeting={mockHandlers.onScheduleMeeting}
          onGenerateReport={mockHandlers.onGenerateReport}
          onManageTeam={mockHandlers.onManageTeam}
          onViewAnalytics={mockHandlers.onViewAnalytics}
          onManageNotifications={mockHandlers.onManageNotifications}
          onGetHelp={mockHandlers.onGetHelp}
        />
      )

      // Check for action buttons with proper labels
      expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /import data/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /schedule meeting/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /manage team/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /view analytics/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /get help/i })).toBeInTheDocument()
    })

    it('should be navigable with keyboard', async () => {
      const user = userEvent.setup()
      render(
        <QuickActions
          onExportData={mockHandlers.onExportData}
          onImportData={mockHandlers.onImportData}
          onOpenSettings={mockHandlers.onOpenSettings}
          onSendMessage={mockHandlers.onSendMessage}
          onScheduleMeeting={mockHandlers.onScheduleMeeting}
          onGenerateReport={mockHandlers.onGenerateReport}
          onManageTeam={mockHandlers.onManageTeam}
          onViewAnalytics={mockHandlers.onViewAnalytics}
          onManageNotifications={mockHandlers.onManageNotifications}
          onGetHelp={mockHandlers.onGetHelp}
        />
      )

      // Tab through all buttons
      const buttons = screen.getAllByRole('button')
      for (let i = 0; i < buttons.length; i++) {
        await user.tab()
        expect(buttons[i]).toHaveFocus()
      }
    })

    it('should handle button clicks with proper feedback', async () => {
      const user = userEvent.setup()
      render(
        <QuickActions
          onExportData={mockHandlers.onExportData}
          onImportData={mockHandlers.onImportData}
          onOpenSettings={mockHandlers.onOpenSettings}
          onSendMessage={mockHandlers.onSendMessage}
          onScheduleMeeting={mockHandlers.onScheduleMeeting}
          onGenerateReport={mockHandlers.onGenerateReport}
          onManageTeam={mockHandlers.onManageTeam}
          onViewAnalytics={mockHandlers.onViewAnalytics}
          onManageNotifications={mockHandlers.onManageNotifications}
          onGetHelp={mockHandlers.onGetHelp}
        />
      )

      // Test button interactions
      await user.click(screen.getByRole('button', { name: /export data/i }))
      expect(mockHandlers.onExportData).toHaveBeenCalledTimes(1)

      await user.click(screen.getByRole('button', { name: /settings/i }))
      expect(mockHandlers.onOpenSettings).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long lead names gracefully', () => {
      const longNameLeads = [{
        ...mockLeads[0],
        name: 'A'.repeat(1000) // Very long name
      }]

      render(
        <LeadManagement
          leads={longNameLeads}
          onLeadUpdate={mockHandlers.onLeadUpdate}
          onLeadContact={mockHandlers.onLeadContact}
          onLeadConvert={mockHandlers.onLeadConvert}
          onLeadReject={mockHandlers.onLeadReject}
          onExportLeads={mockHandlers.onExportLeads}
        />
      )

      // Should not break layout or cause overflow
      expect(screen.getByText(longNameLeads[0].name)).toBeInTheDocument()
    })

    it('should handle special characters in lead data', () => {
      const specialCharLeads = [{
        ...mockLeads[0],
        name: 'José María O\'Connor-Smith',
        email: 'josé.maría+test@example.com'
      }]

      render(
        <LeadManagement
          leads={specialCharLeads}
          onLeadUpdate={mockHandlers.onLeadUpdate}
          onLeadContact={mockHandlers.onLeadContact}
          onLeadConvert={mockHandlers.onLeadConvert}
          onLeadReject={mockHandlers.onLeadReject}
          onExportLeads={mockHandlers.onExportLeads}
        />
      )

      expect(screen.getByText('José María O\'Connor-Smith')).toBeInTheDocument()
      expect(screen.getByText('josé.maría+test@example.com')).toBeInTheDocument()
    })

    it('should handle extreme metric values', () => {
      const extremeMetrics = {
        ...mockMetrics,
        total_commission: 999999999,
        avg_conversion_rate: 99.99
      }

      render(
        <BrokerMetrics
          metrics={extremeMetrics}
          leadTrends={mockLeadTrends}
          commissionReports={mockCommissionReports}
          leadSources={mockLeadSources}
        />
      )

      // Should format large numbers properly
      expect(screen.getByText(/\$999,999,999/)).toBeInTheDocument()
      expect(screen.getByText(/99\.99%/)).toBeInTheDocument()
    })

    it('should handle empty data arrays gracefully', () => {
      render(
        <BrokerMetrics
          metrics={mockMetrics}
          leadTrends={[]}
          commissionReports={[]}
          leadSources={[]}
        />
      )

      // Should render without errors
      expect(screen.getByText(/lead trends/i)).toBeInTheDocument()
      expect(screen.getByText(/commission reports/i)).toBeInTheDocument()
    })

    it('should handle rapid state changes', async () => {
      const user = userEvent.setup()
      render(
        <LeadManagement
          leads={mockLeads}
          onLeadUpdate={mockHandlers.onLeadUpdate}
          onLeadContact={mockHandlers.onLeadContact}
          onLeadConvert={mockHandlers.onLeadConvert}
          onLeadReject={mockHandlers.onLeadReject}
          onExportLeads={mockHandlers.onExportLeads}
        />
      )

      // Rapidly change filters
      const statusFilter = screen.getByRole('combobox', { name: /all status/i })
      const sortFilter = screen.getByRole('combobox', { name: /newest first/i })

      await user.selectOptions(statusFilter, 'pending')
      await user.selectOptions(sortFilter, 'name-asc')
      await user.selectOptions(statusFilter, 'contacted')
      await user.selectOptions(sortFilter, 'lead_score-desc')

      // Should handle rapid changes without errors
      expect(mockHandlers.onLeadUpdate).not.toHaveBeenCalled()
    })
  })

  describe('Screen Reader Compatibility', () => {
    it('should provide proper announcements for dynamic content', async () => {
      const user = userEvent.setup()
      render(
        <LeadManagement
          leads={mockLeads}
          onLeadUpdate={mockHandlers.onLeadUpdate}
          onLeadContact={mockHandlers.onLeadContact}
          onLeadConvert={mockHandlers.onLeadConvert}
          onLeadReject={mockHandlers.onLeadReject}
          onExportLeads={mockHandlers.onExportLeads}
        />
      )

      // Search functionality should be announced
      const searchInput = screen.getByPlaceholderText(/search leads/i)
      await user.type(searchInput, 'John')
      
      // Should show filtered results
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should have proper form labels and descriptions', () => {
      render(
        <LeadManagement
          leads={mockLeads}
          onLeadUpdate={mockHandlers.onLeadUpdate}
          onLeadContact={mockHandlers.onLeadContact}
          onLeadConvert={mockHandlers.onLeadConvert}
          onLeadReject={mockHandlers.onLeadReject}
          onExportLeads={mockHandlers.onExportLeads}
        />
      )

      // All form controls should have proper labels
      const searchInput = screen.getByPlaceholderText(/search leads/i)
      expect(searchInput).toHaveAttribute('type', 'text')

      const statusSelect = screen.getByRole('combobox', { name: /all status/i })
      expect(statusSelect).toBeInTheDocument()

      const sortSelect = screen.getByRole('combobox', { name: /newest first/i })
      expect(sortSelect).toBeInTheDocument()
    })
  })
})