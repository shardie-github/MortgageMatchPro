import { test, expect } from '@playwright/test'

test.describe('MortgageMatch Pro E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the main page with all components', async ({ page }) => {
    // Check if the main heading is visible
    await expect(page.getByRole('heading', { name: 'MortgageMatch Pro' })).toBeVisible()
    
    // Check if the tabs are visible
    await expect(page.getByRole('tab', { name: 'Affordability' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Results' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Rates' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Compare' })).toBeVisible()
    
    // Check if the affordability form is visible
    await expect(page.getByText('Mortgage Affordability Calculator')).toBeVisible()
  })

  test('should calculate affordability successfully', async ({ page }) => {
    // Fill in the affordability form
    await page.getByLabel('Country').selectOption('CA')
    await page.getByLabel('Location (Province/State)').fill('Toronto, ON')
    
    // Set income using slider
    const incomeSlider = page.locator('input[type="range"]').first()
    await incomeSlider.fill('75000')
    
    // Set debts
    const debtsSlider = page.locator('input[type="range"]').nth(1)
    await debtsSlider.fill('500')
    
    // Set down payment
    const downPaymentSlider = page.locator('input[type="range"]').nth(2)
    await downPaymentSlider.fill('50000')
    
    // Set property price
    const propertyPriceSlider = page.locator('input[type="range"]').nth(3)
    await propertyPriceSlider.fill('500000')
    
    // Set interest rate
    const interestRateSlider = page.locator('input[type="range"]').nth(4)
    await interestRateSlider.fill('5.5')
    
    // Set term years
    await page.getByLabel('Amortization Period (Years)').selectOption('25')
    
    // Submit the form
    await page.getByRole('button', { name: 'Calculate Affordability' }).click()
    
    // Wait for calculation to complete
    await page.waitForSelector('[data-testid="affordability-results"]', { timeout: 10000 })
    
    // Check if results are displayed
    await expect(page.getByText('Max Affordable')).toBeVisible()
    await expect(page.getByText('Monthly Payment')).toBeVisible()
    await expect(page.getByText('GDS Ratio')).toBeVisible()
    await expect(page.getByText('Qualification')).toBeVisible()
  })

  test('should fetch and display rates', async ({ page }) => {
    // First calculate affordability
    await page.getByLabel('Country').selectOption('CA')
    await page.getByLabel('Location (Province/State)').fill('Toronto, ON')
    
    const incomeSlider = page.locator('input[type="range"]').first()
    await incomeSlider.fill('75000')
    
    const debtsSlider = page.locator('input[type="range"]').nth(1)
    await debtsSlider.fill('500')
    
    const downPaymentSlider = page.locator('input[type="range"]').nth(2)
    await downPaymentSlider.fill('50000')
    
    const propertyPriceSlider = page.locator('input[type="range"]').nth(3)
    await propertyPriceSlider.fill('500000')
    
    const interestRateSlider = page.locator('input[type="range"]').nth(4)
    await interestRateSlider.fill('5.5')
    
    await page.getByLabel('Amortization Period (Years)').selectOption('25')
    
    await page.getByRole('button', { name: 'Calculate Affordability' }).click()
    
    // Wait for calculation to complete
    await page.waitForSelector('[data-testid="affordability-results"]', { timeout: 10000 })
    
    // Click on Get Current Rates button
    await page.getByRole('button', { name: 'Get Current Rates' }).click()
    
    // Wait for rates to load
    await page.waitForSelector('[data-testid="rate-comparison-table"]', { timeout: 10000 })
    
    // Check if rates are displayed
    await expect(page.getByText('Current Mortgage Rates')).toBeVisible()
    await expect(page.getByText('Lender')).toBeVisible()
    await expect(page.getByText('Rate')).toBeVisible()
    await expect(page.getByText('APR')).toBeVisible()
    await expect(page.getByText('Monthly Payment')).toBeVisible()
  })

  test('should compare scenarios', async ({ page }) => {
    // First calculate affordability and get rates
    await page.getByLabel('Country').selectOption('CA')
    await page.getByLabel('Location (Province/State)').fill('Toronto, ON')
    
    const incomeSlider = page.locator('input[type="range"]').first()
    await incomeSlider.fill('75000')
    
    const debtsSlider = page.locator('input[type="range"]').nth(1)
    await debtsSlider.fill('500')
    
    const downPaymentSlider = page.locator('input[type="range"]').nth(2)
    await downPaymentSlider.fill('50000')
    
    const propertyPriceSlider = page.locator('input[type="range"]').nth(3)
    await propertyPriceSlider.fill('500000')
    
    const interestRateSlider = page.locator('input[type="range"]').nth(4)
    await interestRateSlider.fill('5.5')
    
    await page.getByLabel('Amortization Period (Years)').selectOption('25')
    
    await page.getByRole('button', { name: 'Calculate Affordability' }).click()
    
    // Wait for calculation to complete
    await page.waitForSelector('[data-testid="affordability-results"]', { timeout: 10000 })
    
    // Get rates
    await page.getByRole('button', { name: 'Get Current Rates' }).click()
    await page.waitForSelector('[data-testid="rate-comparison-table"]', { timeout: 10000 })
    
    // Click on Compare Scenarios button
    await page.getByRole('button', { name: 'Compare Scenarios' }).click()
    
    // Wait for comparison to complete
    await page.waitForSelector('[data-testid="scenario-comparison"]', { timeout: 10000 })
    
    // Check if comparison results are displayed
    await expect(page.getByText('Scenario Comparison')).toBeVisible()
    await expect(page.getByText('Recommended:')).toBeVisible()
    await expect(page.getByText('Potential savings:')).toBeVisible()
  })

  test('should handle authentication flow', async ({ page }) => {
    // Click on Sign In button
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    // Should navigate to login page
    await expect(page).toHaveURL('/auth/login')
    await expect(page.getByText('Welcome Back')).toBeVisible()
    
    // Check if form fields are present
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  })

  test('should display error messages for invalid input', async ({ page }) => {
    // Try to submit form with invalid data
    await page.getByLabel('Country').selectOption('CA')
    await page.getByLabel('Location (Province/State)').fill('')
    
    // Set very low income
    const incomeSlider = page.locator('input[type="range"]').first()
    await incomeSlider.fill('10000')
    
    // Set very high debts
    const debtsSlider = page.locator('input[type="range"]').nth(1)
    await debtsSlider.fill('5000')
    
    await page.getByRole('button', { name: 'Calculate Affordability' }).click()
    
    // Should show error or warning
    await expect(page.getByText('Please fill in all required fields')).toBeVisible()
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check if main elements are still visible
    await expect(page.getByRole('heading', { name: 'MortgageMatch Pro' })).toBeVisible()
    await expect(page.getByText('Mortgage Affordability Calculator')).toBeVisible()
    
    // Check if tabs are accessible
    await expect(page.getByRole('tab', { name: 'Affordability' })).toBeVisible()
  })
})