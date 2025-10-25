/**
 * Component Snapshot Tests
 * Tests for UI component consistency and regression detection
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';

// Mock components for testing
const MockButton = ({ children, variant = 'primary', size = 'medium', ...props }: any) => (
  <button
    className={`btn btn-${variant} btn-${size}`}
    {...props}
  >
    {children}
  </button>
);

const MockInput = ({ label, error, ...props }: any) => (
  <div className="input-group">
    <label className="input-label">{label}</label>
    <input
      className={`input ${error ? 'input-error' : ''}`}
      {...props}
    />
    {error && <span className="input-error-message">{error}</span>}
  </div>
);

const MockCard = ({ title, children, ...props }: any) => (
  <div className="card" {...props}>
    {title && <h3 className="card-title">{title}</h3>}
    <div className="card-content">{children}</div>
  </div>
);

const MockModal = ({ isOpen, onClose, children, ...props }: any) => (
  isOpen ? (
    <div className="modal-overlay" {...props}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  ) : null
);

describe('Component Snapshots', () => {
  describe('Button Component', () => {
    it('should match snapshot for primary button', () => {
      const { container } = render(
        <MockButton variant="primary" size="medium">
          Click me
        </MockButton>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for secondary button', () => {
      const { container } = render(
        <MockButton variant="secondary" size="large">
          Secondary Button
        </MockButton>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for small button', () => {
      const { container } = render(
        <MockButton variant="primary" size="small">
          Small
        </MockButton>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for disabled button', () => {
      const { container } = render(
        <MockButton variant="primary" disabled>
          Disabled
        </MockButton>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for button with custom props', () => {
      const { container } = render(
        <MockButton
          variant="primary"
          onClick={() => {}}
          data-testid="custom-button"
          aria-label="Custom button"
        >
          Custom Button
        </MockButton>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Input Component', () => {
    it('should match snapshot for basic input', () => {
      const { container } = render(
        <MockInput
          label="Email"
          type="email"
          placeholder="Enter your email"
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for input with error', () => {
      const { container } = render(
        <MockInput
          label="Password"
          type="password"
          error="Password is required"
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for required input', () => {
      const { container } = render(
        <MockInput
          label="Name"
          type="text"
          required
          placeholder="Enter your name"
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for disabled input', () => {
      const { container } = render(
        <MockInput
          label="Read Only"
          type="text"
          disabled
          value="Cannot edit"
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Card Component', () => {
    it('should match snapshot for basic card', () => {
      const { container } = render(
        <MockCard title="Card Title">
          <p>Card content goes here</p>
        </MockCard>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for card without title', () => {
      const { container } = render(
        <MockCard>
          <p>Card content without title</p>
        </MockCard>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for card with complex content', () => {
      const { container } = render(
        <MockCard title="Complex Card">
          <div>
            <h4>Section 1</h4>
            <p>Content 1</p>
            <h4>Section 2</h4>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </MockCard>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for card with custom props', () => {
      const { container } = render(
        <MockCard
          title="Custom Card"
          className="custom-card"
          data-testid="test-card"
        >
          <p>Custom card content</p>
        </MockCard>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Modal Component', () => {
    it('should match snapshot for open modal', () => {
      const { container } = render(
        <MockModal isOpen={true} onClose={() => {}}>
          <h2>Modal Title</h2>
          <p>Modal content goes here</p>
        </MockModal>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for closed modal', () => {
      const { container } = render(
        <MockModal isOpen={false} onClose={() => {}}>
          <h2>Modal Title</h2>
          <p>Modal content goes here</p>
        </MockModal>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for modal with form', () => {
      const { container } = render(
        <MockModal isOpen={true} onClose={() => {}}>
          <form>
            <h2>Contact Form</h2>
            <MockInput label="Name" type="text" />
            <MockInput label="Email" type="email" />
            <MockButton type="submit">Submit</MockButton>
          </form>
        </MockModal>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Complex Component Combinations', () => {
    it('should match snapshot for form with multiple inputs', () => {
      const { container } = render(
        <form>
          <MockInput label="First Name" type="text" required />
          <MockInput label="Last Name" type="text" required />
          <MockInput label="Email" type="email" required />
          <MockInput label="Phone" type="tel" />
          <div className="form-actions">
            <MockButton variant="secondary" type="button">
              Cancel
            </MockButton>
            <MockButton variant="primary" type="submit">
              Submit
            </MockButton>
          </div>
        </form>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for dashboard layout', () => {
      const { container } = render(
        <div className="dashboard">
          <header className="dashboard-header">
            <h1>Dashboard</h1>
            <MockButton variant="primary">New Item</MockButton>
          </header>
          <div className="dashboard-content">
            <MockCard title="Statistics">
              <p>Some stats here</p>
            </MockCard>
            <MockCard title="Recent Activity">
              <ul>
                <li>Activity 1</li>
                <li>Activity 2</li>
              </ul>
            </MockCard>
          </div>
        </div>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for error state', () => {
      const { container } = render(
        <div className="error-state">
          <MockCard title="Error">
            <p>Something went wrong</p>
            <MockButton variant="primary" onClick={() => {}}>
              Try Again
            </MockButton>
          </MockCard>
        </div>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for loading state', () => {
      const { container } = render(
        <div className="loading-state">
          <MockCard title="Loading">
            <div className="spinner">Loading...</div>
          </MockCard>
        </div>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Accessibility Attributes', () => {
    it('should match snapshot for accessible button', () => {
      const { container } = render(
        <MockButton
          variant="primary"
          aria-label="Close dialog"
          aria-describedby="close-description"
          role="button"
        >
          ×
        </MockButton>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for accessible input', () => {
      const { container } = render(
        <MockInput
          label="Password"
          type="password"
          aria-describedby="password-help"
          aria-required="true"
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for accessible modal', () => {
      const { container } = render(
        <MockModal
          isOpen={true}
          onClose={() => {}}
          role="dialog"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <h2 id="modal-title">Modal Title</h2>
          <p id="modal-description">Modal description</p>
        </MockModal>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Internationalization', () => {
    it('should match snapshot for RTL layout', () => {
      const { container } = render(
        <div dir="rtl" lang="ar">
          <MockCard title="بطاقة">
            <p>محتوى البطاقة</p>
            <MockButton variant="primary">زر</MockButton>
          </MockCard>
        </div>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for long text content', () => {
      const { container } = render(
        <MockCard title="Very Long Title That Might Wrap to Multiple Lines">
          <p>
            This is a very long paragraph that contains a lot of text and might
            wrap to multiple lines. It's important to test how components handle
            long content and ensure they don't break the layout or cause
            accessibility issues.
          </p>
        </MockCard>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});