/**
 * End-to-End User Journey Tests
 * Synthetic user journeys for critical application flows
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'John',
  lastName: 'Doe',
  phone: '555-123-4567'
};

const testScenario = {
  propertyValue: 500000,
  downPayment: 100000,
  loanAmount: 400000,
  creditScore: 750,
  income: 75000,
  employmentStatus: 'employed'
};

test.describe('User Journey Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Sign-up to AI Match Journey', () => {
    test('should complete full sign-up to AI match flow', async ({ page }) => {
      // Step 1: Sign up
      await test.step('User signs up', async () => {
        await page.click('text=Sign Up');
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.fill('[data-testid="first-name-input"]', testUser.firstName);
        await page.fill('[data-testid="last-name-input"]', testUser.lastName);
        await page.click('[data-testid="sign-up-button"]');
        
        // Wait for sign-up completion
        await expect(page.locator('[data-testid="sign-up-success"]')).toBeVisible();
      });

      // Step 2: Email verification
      await test.step('User verifies email', async () => {
        await page.click('[data-testid="verify-email-button"]');
        await expect(page.locator('[data-testid="email-verified"]')).toBeVisible();
      });

      // Step 3: Complete profile setup
      await test.step('User completes profile setup', async () => {
        await page.fill('[data-testid="phone-input"]', testUser.phone);
        await page.selectOption('[data-testid="employment-status"]', 'employed');
        await page.click('[data-testid="complete-profile-button"]');
        
        await expect(page.locator('[data-testid="profile-complete"]')).toBeVisible();
      });

      // Step 4: Navigate to scenario creation
      await test.step('User creates mortgage scenario', async () => {
        await page.click('[data-testid="create-scenario-button"]');
        
        // Fill scenario form
        await page.fill('[data-testid="property-value-input"]', testScenario.propertyValue.toString());
        await page.fill('[data-testid="down-payment-input"]', testScenario.downPayment.toString());
        await page.fill('[data-testid="credit-score-input"]', testScenario.creditScore.toString());
        await page.fill('[data-testid="income-input"]', testScenario.income.toString());
        await page.selectOption('[data-testid="employment-status"]', testScenario.employmentStatus);
        
        await page.click('[data-testid="save-scenario-button"]');
        
        await expect(page.locator('[data-testid="scenario-saved"]')).toBeVisible();
      });

      // Step 5: Get AI match
      await test.step('User gets AI mortgage match', async () => {
        await page.click('[data-testid="get-ai-match-button"]');
        
        // Wait for AI processing
        await expect(page.locator('[data-testid="ai-processing"]')).toBeVisible();
        
        // Wait for AI results
        await expect(page.locator('[data-testid="ai-results"]')).toBeVisible({ timeout: 30000 });
        
        // Verify AI results contain expected elements
        await expect(page.locator('[data-testid="recommended-rate"]')).toBeVisible();
        await expect(page.locator('[data-testid="monthly-payment"]')).toBeVisible();
        await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
      });

      // Step 6: View detailed explanation
      await test.step('User views detailed AI explanation', async () => {
        await page.click('[data-testid="view-explanation-button"]');
        
        await expect(page.locator('[data-testid="explanation-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="key-factors"]')).toBeVisible();
        await expect(page.locator('[data-testid="methodology"]')).toBeVisible();
        await expect(page.locator('[data-testid="disclaimers"]')).toBeVisible();
        
        await page.click('[data-testid="close-explanation-button"]');
      });
    });
  });

  test.describe('Export to CRM Journey', () => {
    test('should complete scenario export to CRM flow', async ({ page }) => {
      // Step 1: Login
      await test.step('User logs in', async () => {
        await page.click('text=Log In');
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-button"]');
        
        await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      });

      // Step 2: Navigate to scenarios
      await test.step('User navigates to scenarios', async () => {
        await page.click('[data-testid="scenarios-tab"]');
        await expect(page.locator('[data-testid="scenarios-list"]')).toBeVisible();
      });

      // Step 3: Select scenario for export
      await test.step('User selects scenario for export', async () => {
        await page.click('[data-testid="scenario-item-0"]');
        await expect(page.locator('[data-testid="scenario-details"]')).toBeVisible();
      });

      // Step 4: Export to CRM
      await test.step('User exports scenario to CRM', async () => {
        await page.click('[data-testid="export-crm-button"]');
        
        // Select export format
        await page.selectOption('[data-testid="export-format"]', 'csv');
        await page.click('[data-testid="confirm-export-button"]');
        
        // Wait for export completion
        await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
        
        // Verify export details
        await expect(page.locator('[data-testid="export-filename"]')).toContainText('.csv');
        await expect(page.locator('[data-testid="export-record-count"]')).toBeVisible();
      });

      // Step 5: Download export file
      await test.step('User downloads export file', async () => {
        const downloadPromise = page.waitForEvent('download');
        await page.click('[data-testid="download-button"]');
        const download = await downloadPromise;
        
        expect(download.suggestedFilename()).toMatch(/\.csv$/);
      });
    });
  });

  test.describe('Billing Event Journey', () => {
    test('should complete billing event flow', async ({ page }) => {
      // Step 1: Login as admin
      await test.step('Admin logs in', async () => {
        await page.click('text=Log In');
        await page.fill('[data-testid="email-input"]', 'admin@example.com');
        await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
        await page.click('[data-testid="login-button"]');
        
        await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
      });

      // Step 2: Navigate to billing
      await test.step('Admin navigates to billing', async () => {
        await page.click('[data-testid="billing-tab"]');
        await expect(page.locator('[data-testid="billing-dashboard"]')).toBeVisible();
      });

      // Step 3: View tenant billing
      await test.step('Admin views tenant billing', async () => {
        await page.click('[data-testid="tenant-billing-button"]');
        await expect(page.locator('[data-testid="tenant-billing-modal"]')).toBeVisible();
      });

      // Step 4: Generate invoice
      await test.step('Admin generates invoice', async () => {
        await page.click('[data-testid="generate-invoice-button"]');
        
        // Wait for invoice generation
        await expect(page.locator('[data-testid="invoice-generated"]')).toBeVisible();
        
        // Verify invoice details
        await expect(page.locator('[data-testid="invoice-amount"]')).toBeVisible();
        await expect(page.locator('[data-testid="invoice-period"]')).toBeVisible();
        await expect(page.locator('[data-testid="invoice-items"]')).toBeVisible();
      });

      // Step 5: Process payment
      await test.step('Admin processes payment', async () => {
        await page.click('[data-testid="process-payment-button"]');
        
        // Fill payment details
        await page.fill('[data-testid="card-number"]', '4242424242424242');
        await page.fill('[data-testid="expiry-date"]', '12/25');
        await page.fill('[data-testid="cvv"]', '123');
        await page.fill('[data-testid="cardholder-name"]', 'Test User');
        
        await page.click('[data-testid="submit-payment-button"]');
        
        // Wait for payment processing
        await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
        
        // Wait for payment success
        await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 10000 });
      });

      // Step 6: Verify billing event
      await test.step('Admin verifies billing event', async () => {
        await page.click('[data-testid="view-billing-events-button"]');
        await expect(page.locator('[data-testid="billing-events-list"]')).toBeVisible();
        
        // Verify the new billing event
        await expect(page.locator('[data-testid="billing-event-0"]')).toBeVisible();
        await expect(page.locator('[data-testid="billing-event-0"]')).toContainText('Payment Processed');
      });
    });
  });

  test.describe('Error Handling Journey', () => {
    test('should handle errors gracefully throughout the flow', async ({ page }) => {
      // Step 1: Attempt login with invalid credentials
      await test.step('User attempts login with invalid credentials', async () => {
        await page.click('text=Log In');
        await page.fill('[data-testid="email-input"]', 'invalid@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');
        
        // Verify error message
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
      });

      // Step 2: Attempt to create scenario without required fields
      await test.step('User attempts to create scenario with missing fields', async () => {
        await page.click('[data-testid="create-scenario-button"]');
        await page.click('[data-testid="save-scenario-button"]');
        
        // Verify validation errors
        await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="validation-error"]')).toContainText('Required fields missing');
      });

      // Step 3: Attempt AI match with incomplete data
      await test.step('User attempts AI match with incomplete data', async () => {
        // Fill partial scenario data
        await page.fill('[data-testid="property-value-input"]', '500000');
        await page.click('[data-testid="get-ai-match-button"]');
        
        // Verify error handling
        await expect(page.locator('[data-testid="ai-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="ai-error"]')).toContainText('Insufficient data for AI analysis');
      });

      // Step 4: Test network error handling
      await test.step('User experiences network error', async () => {
        // Simulate network error by going offline
        await page.context().setOffline(true);
        
        await page.click('[data-testid="refresh-button"]');
        
        // Verify offline error message
        await expect(page.locator('[data-testid="offline-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="offline-error"]')).toContainText('Network connection required');
        
        // Restore network
        await page.context().setOffline(false);
      });
    });
  });

  test.describe('Accessibility Journey', () => {
    test('should be accessible via keyboard navigation', async ({ page }) => {
      // Step 1: Navigate using keyboard only
      await test.step('User navigates using keyboard only', async () => {
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter'); // Should activate sign up button
        
        await expect(page.locator('[data-testid="sign-up-form"]')).toBeVisible();
      });

      // Step 2: Fill form using keyboard
      await test.step('User fills form using keyboard', async () => {
        await page.keyboard.type(testUser.email);
        await page.keyboard.press('Tab');
        await page.keyboard.type(testUser.password);
        await page.keyboard.press('Tab');
        await page.keyboard.type(testUser.firstName);
        await page.keyboard.press('Tab');
        await page.keyboard.type(testUser.lastName);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter'); // Submit form
        
        await expect(page.locator('[data-testid="sign-up-success"]')).toBeVisible();
      });

      // Step 3: Verify focus management
      await test.step('User verifies focus management', async () => {
        // Check that focus is on the next logical element
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedElement).toBe('BUTTON');
      });
    });

    test('should work with screen reader', async ({ page }) => {
      // Step 1: Check for proper ARIA labels
      await test.step('User verifies ARIA labels', async () => {
        await page.goto('/');
        
        // Check for proper ARIA labels on interactive elements
        const signUpButton = page.locator('[data-testid="sign-up-button"]');
        await expect(signUpButton).toHaveAttribute('aria-label');
        
        const emailInput = page.locator('[data-testid="email-input"]');
        await expect(emailInput).toHaveAttribute('aria-describedby');
      });

      // Step 2: Check for proper heading structure
      await test.step('User verifies heading structure', async () => {
        const h1 = page.locator('h1');
        await expect(h1).toBeVisible();
        
        const h2 = page.locator('h2');
        await expect(h2).toBeVisible();
      });

      // Step 3: Check for proper form labels
      await test.step('User verifies form labels', async () => {
        await page.click('[data-testid="sign-up-button"]');
        
        const emailLabel = page.locator('label[for="email-input"]');
        await expect(emailLabel).toBeVisible();
        
        const passwordLabel = page.locator('label[for="password-input"]');
        await expect(passwordLabel).toBeVisible();
      });
    });
  });

  test.describe('Performance Journey', () => {
    test('should load within performance thresholds', async ({ page }) => {
      // Step 1: Measure initial page load
      await test.step('User measures initial page load', async () => {
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Should load within 3 seconds
        expect(loadTime).toBeLessThan(3000);
      });

      // Step 2: Measure navigation performance
      await test.step('User measures navigation performance', async () => {
        const startTime = Date.now();
        await page.click('[data-testid="sign-up-button"]');
        await page.waitForLoadState('networkidle');
        const navigationTime = Date.now() - startTime;
        
        // Should navigate within 1 second
        expect(navigationTime).toBeLessThan(1000);
      });

      // Step 3: Measure form submission performance
      await test.step('User measures form submission performance', async () => {
        // Fill form
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.fill('[data-testid="first-name-input"]', testUser.firstName);
        await page.fill('[data-testid="last-name-input"]', testUser.lastName);
        
        const startTime = Date.now();
        await page.click('[data-testid="sign-up-button"]');
        await page.waitForSelector('[data-testid="sign-up-success"]');
        const submissionTime = Date.now() - startTime;
        
        // Should submit within 2 seconds
        expect(submissionTime).toBeLessThan(2000);
      });
    });
  });
});