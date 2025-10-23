import { test, expect } from '@playwright/test'

test.describe('MortgageMatch Pro E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock external APIs
    await page.route('**/api/affordability', async (route) => {
      const mockResponse = {
        maxAffordable: 500000,
        monthlyPayment: 2500,
        gdsRatio: 30,
        tdsRatio: 40,
        dtiRatio: 35,
        qualifyingRate: 5.5,
        qualificationResult: true,
        breakdown: {
          principal: 2000,
          interest: 500,
          taxes: 300,
          insurance: 200,
        },
        recommendations: ['Consider a larger down payment'],
        disclaimers: ['This is an estimate only'],
      }
      await route.fulfill({ json: mockResponse })
    })

    await page.route('**/api/rates', async (route) => {
      const mockResponse = {
        rates: [
          {
            lender: 'Royal Bank of Canada',
            rate: 5.45,
            apr: 5.52,
            term: 25,
            type: 'fixed',
            paymentEstimate: 2847.23,
            features: ['No fee', 'Pre-approval available'],
            contactInfo: {
              phone: '1-800-769-2511',
              email: 'mortgages@rbc.com',
              website: 'https://rbc.com/mortgages',
            },
          },
        ],
        cached: false,
        lastUpdated: new Date().toISOString(),
      }
      await route.fulfill({ json: mockResponse })
    })

    await page.route('**/api/leads', async (route) => {
      const mockResponse = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+14161234567',
        leadData: {
          income: 75000,
          debts: 500,
          downPayment: 50000,
          propertyPrice: 500000,
          creditScore: 750,
          employmentType: 'salaried',
          location: 'Toronto, ON',
        },
        leadScore: 85,
        brokerRecommendations: [
          {
            brokerId: 'broker-1',
            name: 'John Smith',
            company: 'Royal Bank Mortgage',
            commissionRate: 0.75,
            matchReason: 'High income and good credit',
          },
        ],
        leadId: 'test-lead-id',
        message: 'Lead submitted successfully',
      }
      await route.fulfill({ json: mockResponse })
    })
  })

  test('should complete full affordability calculation flow', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to load
    await expect(page.locator('h1')).toBeVisible()

    // Fill in the affordability form
    await page.selectOption('select[name="country"]', 'CA')
    await page.fill('input[name="location"]', 'Toronto, ON')
    await page.fill('input[name="income"]', '75000')
    await page.fill('input[name="debts"]', '500')
    await page.fill('input[name="downPayment"]', '50000')
    await page.fill('input[name="propertyPrice"]', '500000')
    await page.fill('input[name="interestRate"]', '5.5')
    await page.selectOption('select[name="termYears"]', '25')

    // Submit the form
    await page.click('button[type="submit"]')

    // Wait for the results to load
    await expect(page.locator('[data-testid="affordability-results"]')).toBeVisible()

    // Verify the results are displayed
    await expect(page.locator('[data-testid="max-affordable"]')).toContainText('$500,000')
    await expect(page.locator('[data-testid="monthly-payment"]')).toContainText('$2,500')
    await expect(page.locator('[data-testid="qualification-result"]')).toContainText('Qualified')
  })

  test('should complete rate comparison flow', async ({ page }) => {
    await page.goto('/')

    // Navigate to rates tab
    await page.click('[data-testid="rates-tab"]')

    // Fill in rate search form
    await page.selectOption('select[name="country"]', 'CA')
    await page.selectOption('select[name="termYears"]', '25')
    await page.selectOption('select[name="rateType"]', 'fixed')
    await page.fill('input[name="propertyPrice"]', '500000')
    await page.fill('input[name="downPayment"]', '50000')

    // Submit the form
    await page.click('button[type="submit"]')

    // Wait for the results to load
    await expect(page.locator('[data-testid="rates-results"]')).toBeVisible()

    // Verify rates are displayed
    await expect(page.locator('[data-testid="rate-card"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="lender-name"]')).toContainText('Royal Bank of Canada')
    await expect(page.locator('[data-testid="rate"]')).toContainText('5.45%')
  })

  test('should complete lead submission flow', async ({ page }) => {
    await page.goto('/')

    // Navigate to leads tab
    await page.click('[data-testid="leads-tab"]')

    // Fill in lead form
    await page.fill('input[name="name"]', 'John Doe')
    await page.fill('input[name="email"]', 'john@example.com')
    await page.fill('input[name="phone"]', '+14161234567')
    await page.fill('input[name="income"]', '75000')
    await page.fill('input[name="debts"]', '500')
    await page.fill('input[name="downPayment"]', '50000')
    await page.fill('input[name="propertyPrice"]', '500000')
    await page.fill('input[name="creditScore"]', '750')
    await page.selectOption('select[name="employmentType"]', 'salaried')
    await page.fill('input[name="location"]', 'Toronto, ON')

    // Submit the form
    await page.click('button[type="submit"]')

    // Wait for the success message
    await expect(page.locator('[data-testid="lead-success"]')).toBeVisible()

    // Verify lead score and broker recommendations
    await expect(page.locator('[data-testid="lead-score"]')).toContainText('85')
    await expect(page.locator('[data-testid="broker-recommendation"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="broker-name"]')).toContainText('John Smith')
  })

  test('should handle form validation errors', async ({ page }) => {
    await page.goto('/')

    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Verify validation errors are shown
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
    await expect(page.locator('text=Required field')).toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/affordability', async (route) => {
      await route.fulfill({ 
        status: 500, 
        json: { error: 'Internal server error' } 
      })
    })

    await page.goto('/')

    // Fill in the form
    await page.selectOption('select[name="country"]', 'CA')
    await page.fill('input[name="location"]', 'Toronto, ON')
    await page.fill('input[name="income"]', '75000')
    await page.fill('input[name="debts"]', '500')
    await page.fill('input[name="downPayment"]', '50000')
    await page.fill('input[name="propertyPrice"]', '500000')
    await page.fill('input[name="interestRate"]', '5.5')
    await page.selectOption('select[name="termYears"]', '25')

    // Submit the form
    await page.click('button[type="submit"]')

    // Verify error message is shown
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('text=Failed to calculate affordability')).toBeVisible()
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')

    // Verify the page is responsive
    await expect(page.locator('h1')).toBeVisible()
    
    // Check that form elements are accessible on mobile
    await expect(page.locator('select[name="country"]')).toBeVisible()
    await expect(page.locator('input[name="location"]')).toBeVisible()
    
    // Verify mobile navigation works
    await page.click('[data-testid="mobile-menu"]')
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
  })

  test('should maintain state across page refreshes', async ({ page }) => {
    await page.goto('/')

    // Fill in some form data
    await page.selectOption('select[name="country"]', 'CA')
    await page.fill('input[name="location"]', 'Toronto, ON')
    await page.fill('input[name="income"]', '75000')

    // Refresh the page
    await page.reload()

    // Verify state is maintained (if implemented)
    // This would depend on your state management implementation
  })

  test('should work with different browsers', async ({ page, browserName }) => {
    await page.goto('/')

    // Basic functionality test that should work across browsers
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('select[name="country"]')).toBeVisible()
    await expect(page.locator('input[name="location"]')).toBeVisible()
    
    // Browser-specific tests could be added here
    if (browserName === 'chromium') {
      // Chrome-specific tests
    } else if (browserName === 'firefox') {
      // Firefox-specific tests
    } else if (browserName === 'webkit') {
      // Safari-specific tests
    }
  })

  test('should handle concurrent users', async ({ page, context }) => {
    // Create multiple browser contexts to simulate concurrent users
    const contexts = await Promise.all([
      context,
      context.browser()?.newContext(),
      context.browser()?.newContext(),
    ].filter(Boolean))

    const pages = await Promise.all(
      contexts.map(ctx => ctx.newPage())
    )

    // All users navigate to the page simultaneously
    await Promise.all(pages.map(p => p.goto('/')))

    // All users fill in the form simultaneously
    await Promise.all(pages.map(async (p, index) => {
      await p.selectOption('select[name="country"]', 'CA')
      await p.fill('input[name="location"]', `Toronto, ON ${index}`)
      await p.fill('input[name="income"]', '75000')
      await p.fill('input[name="debts"]', '500')
      await p.fill('input[name="downPayment"]', '50000')
      await p.fill('input[name="propertyPrice"]', '500000')
      await p.fill('input[name="interestRate"]', '5.5')
      await p.selectOption('select[name="termYears"]', '25')
      await p.click('button[type="submit"]')
    }))

    // Verify all users get results
    await Promise.all(pages.map(p => 
      expect(p.locator('[data-testid="affordability-results"]')).toBeVisible()
    ))

    // Clean up
    await Promise.all(contexts.map(ctx => ctx.close()))
  })
})