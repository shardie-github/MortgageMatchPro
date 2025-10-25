import { test, expect } from '@playwright/test'

test.describe('Lead Generation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/')
  })

  test('should complete full lead generation flow', async ({ page }) => {
    // Step 1: Fill out affordability calculator
    await page.fill('[data-testid="income-input"]', '80000')
    await page.fill('[data-testid="property-price-input"]', '500000')
    await page.fill('[data-testid="down-payment-input"]', '100000')
    await page.selectOption('[data-testid="employment-type-select"]', 'salaried')
    await page.fill('[data-testid="credit-score-input"]', '750')

    // Step 2: Click calculate affordability
    await page.click('[data-testid="calculate-button"]')

    // Step 3: Wait for results and click "Connect with Brokers"
    await expect(page.locator('[data-testid="affordability-result"]')).toBeVisible()
    await page.click('[data-testid="connect-brokers-button"]')

    // Step 4: Fill out lead generation form
    await expect(page.locator('[data-testid="lead-gen-modal"]')).toBeVisible()
    
    await page.fill('[data-testid="lead-name-input"]', 'John Doe')
    await page.fill('[data-testid="lead-email-input"]', 'john@example.com')
    await page.fill('[data-testid="lead-phone-input"]', '555-123-4567')
    await page.fill('[data-testid="property-value-input"]', '500000')
    await page.fill('[data-testid="down-payment-input"]', '100000')
    await page.fill('[data-testid="income-input"]', '80000')
    await page.selectOption('[data-testid="employment-type-select"]', 'salaried')
    await page.fill('[data-testid="credit-score-input"]', '750')
    await page.fill('[data-testid="preferred-lender-input"]', 'Test Bank')
    await page.fill('[data-testid="additional-info-textarea"]', 'First time buyer')

    // Step 5: Check consent checkboxes
    await page.check('[data-testid="consent-to-share-checkbox"]')
    await page.check('[data-testid="consent-to-contact-checkbox"]')

    // Step 6: Submit the form
    await page.click('[data-testid="submit-lead-button"]')

    // Step 7: Verify success message
    await expect(page.locator('[data-testid="lead-success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="lead-score"]')).toContainText('85')
    await expect(page.locator('[data-testid="qualification-tier"]')).toContainText('PREMIUM')
  })

  test('should show validation errors for invalid input', async ({ page }) => {
    // Open lead generation modal
    await page.click('[data-testid="connect-brokers-button"]')
    await expect(page.locator('[data-testid="lead-gen-modal"]')).toBeVisible()

    // Try to submit with invalid data
    await page.fill('[data-testid="lead-email-input"]', 'invalid-email')
    await page.fill('[data-testid="credit-score-input"]', '999') // Invalid credit score
    await page.click('[data-testid="submit-lead-button"]')

    // Verify validation errors
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email')
    await expect(page.locator('[data-testid="credit-score-error"]')).toContainText('between 300 and 850')
  })

  test('should require consent checkboxes', async ({ page }) => {
    // Open lead generation modal
    await page.click('[data-testid="connect-brokers-button"]')
    await expect(page.locator('[data-testid="lead-gen-modal"]')).toBeVisible()

    // Fill out form but don't check consent
    await page.fill('[data-testid="lead-name-input"]', 'John Doe')
    await page.fill('[data-testid="lead-email-input"]', 'john@example.com')
    await page.fill('[data-testid="lead-phone-input"]', '555-123-4567')
    // ... fill other required fields

    await page.click('[data-testid="submit-lead-button"]')

    // Verify consent error
    await expect(page.locator('[data-testid="consent-error"]')).toContainText('must consent')
  })

  test('should display lead score and broker recommendations', async ({ page }) => {
    // Complete the lead generation flow
    await page.click('[data-testid="connect-brokers-button"]')
    await expect(page.locator('[data-testid="lead-gen-modal"]')).toBeVisible()

    // Fill out high-quality lead data
    await page.fill('[data-testid="lead-name-input"]', 'John Doe')
    await page.fill('[data-testid="lead-email-input"]', 'john@example.com')
    await page.fill('[data-testid="lead-phone-input"]', '555-123-4567')
    await page.fill('[data-testid="property-value-input"]', '500000')
    await page.fill('[data-testid="down-payment-input"]', '100000')
    await page.fill('[data-testid="income-input"]', '80000')
    await page.selectOption('[data-testid="employment-type-select"]', 'salaried')
    await page.fill('[data-testid="credit-score-input"]', '750')
    await page.check('[data-testid="consent-to-share-checkbox"]')
    await page.check('[data-testid="consent-to-contact-checkbox"]')

    await page.click('[data-testid="submit-lead-button"]')

    // Verify lead score display
    await expect(page.locator('[data-testid="lead-score"]')).toBeVisible()
    await expect(page.locator('[data-testid="qualification-tier"]')).toBeVisible()

    // Verify broker recommendations
    await expect(page.locator('[data-testid="broker-recommendations"]')).toBeVisible()
    await expect(page.locator('[data-testid="broker-card"]')).toHaveCount(1, 3) // 1-3 brokers
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/leads', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    // Complete the lead generation flow
    await page.click('[data-testid="connect-brokers-button"]')
    await expect(page.locator('[data-testid="lead-gen-modal"]')).toBeVisible()

    // Fill out form
    await page.fill('[data-testid="lead-name-input"]', 'John Doe')
    await page.fill('[data-testid="lead-email-input"]', 'john@example.com')
    await page.fill('[data-testid="lead-phone-input"]', '555-123-4567')
    // ... fill other required fields
    await page.check('[data-testid="consent-to-share-checkbox"]')
    await page.check('[data-testid="consent-to-contact-checkbox"]')

    await page.click('[data-testid="submit-lead-button"]')

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  })
})